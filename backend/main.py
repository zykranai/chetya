from contextlib import asynccontextmanager
from typing import Annotated, Literal, Optional

import uuid as uuid_mod
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from jwt.exceptions import InvalidTokenError

from .auth_tokens import create_session_token, refresh_language_claim, resolve_user_from_bearer
from .utils.geocoding import get_coordinates
from .reading.generator import generate_reading, generate_daily_reading
from .reading.astro_chat import run_astro_chat
from .persistence import fetch_profile, fetch_user_chart, fetch_user_chart_bundle, upsert_profile
from .db.session import SessionLocal, get_database_url_safe, init_db
from .db import repository as repo
from .db.repository import SessionForbidden

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Chetya API",
    description="World's first situation-aware AI astrology engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization Bearer token required")
    token = authorization.replace("Bearer ", "", 1).strip()
    try:
        return resolve_user_from_bearer(token)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class EmailAuthRequest(BaseModel):
    email: EmailStr
    language: str = Field(default="en", description="UI / response language code (en, hi, ta, …)")


class LanguagePatchRequest(BaseModel):
    language: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=120_000)

    @field_validator("content")
    @classmethod
    def strip_nonempty(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("message content cannot be empty")
        return t


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    session_id: Optional[str] = None


class GuestChatRequest(BaseModel):
    messages: list[ChatMessage]
    language: str = Field(default="en", max_length=32)


class ReadingRequest(BaseModel):
    name: str
    dob: str
    tob: str
    place: str
    age: int
    location_type: str = "home"
    financial_situation: str = "working"
    financial_level: str = "medium"
    main_concern: str = "general"
    specific_question: Optional[str] = None
    language: str = "en"
    current_city: Optional[str] = None
    user_id: Optional[str] = None
    prior_context: Optional[dict] = None


@app.get("/")
def root():
    return {"app": "Chetya", "tagline": "Not your kundli. Your life.", "status": "running"}


@app.post("/reading/generate")
async def generate(
    request: ReadingRequest,
    authorization: Annotated[Optional[str], Header()] = None,
):
    try:
        geo_data = await get_coordinates(request.place)
        intake = request.model_dump()
        if authorization and authorization.startswith("Bearer "):
            try:
                u = resolve_user_from_bearer(authorization.replace("Bearer ", "", 1).strip())
                intake["user_id"] = u["user_id"]
                intake["language"] = intake.get("language") or u.get("language") or "en"
            except InvalidTokenError:
                pass
        reading = await generate_reading(user_intake=intake, geo_data=geo_data)
        return {"success": True, "data": reading}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/reading/daily/{user_id}")
async def daily_reading(user_id: str, language: str = "en"):
    chart = fetch_user_chart(user_id)
    if not chart:
        raise HTTPException(
            status_code=404,
            detail="No saved chart for this user_id. Complete a full reading with user_id first.",
        )
    text = await generate_daily_reading(chart, language=language)
    return {"success": True, "data": {"daily": text, "user_id": user_id}}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "app": "Chetya",
        "database": get_database_url_safe(),
    }


@app.post("/auth/email")
def auth_email_passwordless(body: EmailAuthRequest):
    """
    Start session with email + preferred language (passwordless identifier login).
    Returns a Chetya JWT. Profile is stored in the local/SQL database (and Supabase when configured).
    """
    token, user_id = create_session_token(body.email, body.language)
    upsert_profile(user_id, body.email.lower().strip(), body.language)
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
    }


@app.patch("/me/language")
def patch_my_language(body: LanguagePatchRequest, user: dict = Depends(get_current_user)):
    upsert_profile(user["user_id"], user.get("email") or "", body.language)
    email = user.get("email")
    if email:
        token, _ = refresh_language_claim(email, body.language)
        return {"success": True, "access_token": token, "language": body.language}
    return {"success": True, "language": body.language}


@app.get("/me")
def me(user: dict = Depends(get_current_user)):
    prof = fetch_profile(user["user_id"])
    bundle = fetch_user_chart_bundle(user["user_id"])
    return {
        "success": True,
        "user_id": user["user_id"],
        "email": user.get("email") or (prof or {}).get("email"),
        "language": (prof or {}).get("preferred_language") or user.get("language"),
        "has_saved_chart": bundle is not None and bundle.get("chart_json") is not None,
    }


@app.get("/chat/sessions")
def list_chat_sessions(user: dict = Depends(get_current_user)):
    db = SessionLocal()
    try:
        sessions = repo.list_chat_sessions(db, user["user_id"])
    finally:
        db.close()
    return {"success": True, "sessions": sessions}


@app.get("/chat/sessions/{session_id}/messages")
def get_chat_messages(session_id: str, user: dict = Depends(get_current_user)):
    db = SessionLocal()
    try:
        messages = repo.get_session_messages(db, user["user_id"], session_id)
    finally:
        db.close()
    return {"success": True, "session_id": session_id, "messages": messages}


@app.post("/chat")
async def chat_with_guru(body: ChatRequest, user: dict = Depends(get_current_user)):
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages required")
    sid = (body.session_id or "").strip() or str(uuid_mod.uuid4())

    from .db.models import ChatSession as ChatSessionModel

    if body.session_id:
        db_check = SessionLocal()
        try:
            ex = db_check.get(ChatSessionModel, sid)
            if ex is not None and ex.user_id != user["user_id"]:
                raise HTTPException(status_code=403, detail="Chat session does not belong to this account")
        finally:
            db_check.close()

    bundle = fetch_user_chart_bundle(user["user_id"])
    computed = (bundle or {}).get("computed_facts_json")
    chart = (bundle or {}).get("chart_json")
    prof = fetch_profile(user["user_id"])
    lang = (prof or {}).get("preferred_language") or user.get("language") or "en"
    name = (chart or {}).get("name") or user.get("email", "friend").split("@")[0]
    first = (name or "friend").split()[0]
    msgs = [m.model_dump() for m in body.messages]
    reply = await run_astro_chat(
        msgs,
        computed_facts=computed,
        user_language=lang,
        user_first_name=first,
    )
    full = msgs + [{"role": "assistant", "content": reply}]
    db_save = SessionLocal()
    try:
        try:
            repo.replace_session_messages(db_save, user["user_id"], sid, full)
        except SessionForbidden:
            raise HTTPException(status_code=403, detail="Chat session does not belong to this account")
    finally:
        db_save.close()

    return {
        "success": True,
        "message": {"role": "assistant", "content": reply},
        "session_id": sid,
    }


def _parse_guest_id(
    x_chetya_guest_id: Annotated[Optional[str], Header(alias="X-Chetya-Guest-Id")] = None,
) -> str:
    if not x_chetya_guest_id or not x_chetya_guest_id.strip():
        raise HTTPException(status_code=400, detail="X-Chetya-Guest-Id header required")
    try:
        return str(uuid_mod.UUID(x_chetya_guest_id.strip()))
    except ValueError:
        raise HTTPException(status_code=400, detail="X-Chetya-Guest-Id must be a valid UUID")


@app.get("/guest/quota")
def guest_quota(guest_id: Annotated[str, Depends(_parse_guest_id)]):
    """Remaining free prompts for this guest UUID (requires X-Chetya-Guest-Id)."""
    db = SessionLocal()
    try:
        remaining = repo.guest_prompts_remaining(db, guest_id)
    finally:
        db.close()
    return {
        "success": True,
        "guest_prompts_remaining": remaining,
        "guest_prompt_limit": repo.GUEST_PROMPT_LIMIT,
    }


@app.post("/chat/guest")
async def chat_guest(
    body: GuestChatRequest,
    guest_id: Annotated[str, Depends(_parse_guest_id)],
):
    """
    Anonymous trial: up to 6 user prompts per guest UUID (tracked server-side).
    No chat history persistence; no saved chart — same grounding rules as signed-in users without a chart.
    """
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages required")

    db_pre = SessionLocal()
    try:
        remaining_before = repo.guest_prompts_remaining(db_pre, guest_id)
        if remaining_before <= 0:
            raise HTTPException(
                status_code=403,
                detail="You've used all 6 free questions. Sign in with your email for full conversations.",
            )
    finally:
        db_pre.close()

    lang = (body.language or "en").strip() or "en"
    msgs = [m.model_dump() for m in body.messages]
    reply = await run_astro_chat(
        msgs,
        computed_facts=None,
        user_language=lang,
        user_first_name="friend",
    )

    db_post = SessionLocal()
    try:
        prompts_left = repo.increment_guest_prompt(db_post, guest_id)
    finally:
        db_post.close()

    return {
        "success": True,
        "message": {"role": "assistant", "content": reply},
        "session_id": None,
        "guest_prompts_remaining": prompts_left,
    }
