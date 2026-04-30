"""Validate model-returned reading JSON against computed_facts guardrails."""

from __future__ import annotations

import json
import re
from typing import Any

APPROVED_CITATION_PREFIXES = (
    "BPHS",
    "Brihat Jataka",
    "Saravali",
    "Phaladeepika",
    "Jataka Parijata",
    "Hora Sara",
    "Sarvartha Chintamani",
    "Chamatkar Chintamani",
    "Uttara Kalamrita",
    "Yavana Jataka",
    "Jaimini",
    "Tajika",
    "Prashna Marga",
    "Krishneeyam",
    "Muhurta Chintamani",
    "Mantra Mahodadhi",
    "Garuda Purana",
    "Brihat Samhita",
    "Mayamatam",
    "Manasara",
    "Shiva Swarodaya",
    "Lal Kitab",
    "KP Reader",
    "Neelakanthi",
    "Classical",
)


def extract_json_object(text: str) -> dict[str, Any] | None:
    """Parse JSON from model output; tolerate ```json fences."""
    raw = text.strip()
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", raw)
    if fence:
        raw = fence.group(1).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _word_count_reading(obj: dict[str, Any]) -> int:
    parts = [
        obj.get("opening", ""),
        obj.get("current_season", ""),
        obj.get("concern_response", ""),
        obj.get("guidance", ""),
        obj.get("closing", ""),
    ]
    remedies = obj.get("remedies") or {}
    for tier in ("free", "affordable"):
        block = remedies.get(tier)
        if isinstance(block, dict):
            parts.append(block.get("description", ""))
    el = remedies.get("elevated")
    if isinstance(el, dict):
        parts.append(el.get("description", ""))
    return sum(len((p or "").split()) for p in parts)


def citation_ok(cit: str) -> bool:
    return any(cit.strip().startswith(pref) for pref in APPROVED_CITATION_PREFIXES)


def validate_reading_payload(
    payload: dict[str, Any],
    computed_facts: dict[str, Any],
) -> tuple[bool, list[str]]:
    """
    Returns (ok, issues). Soft validation — caller may still accept with warnings.
    """
    issues: list[str] = []
    wc = _word_count_reading(payload)
    if wc > 2200:
        issues.append(f"Reading very long (~{wc} words); target under ~1500.")
    if wc < 120:
        issues.append(f"Reading short (~{wc} words); target at least ~300.")

    for cit in payload.get("shastra_citations") or []:
        if isinstance(cit, str) and not citation_ok(cit):
            issues.append(f"Citation not in approved list style: {cit}")

    elevated = (payload.get("remedies") or {}).get("elevated")
    if isinstance(elevated, dict):
        desc = (elevated.get("description") or "") + (elevated.get("title") or "")
        if re.search(r"gems?tone|Neelam|Pukhraj|Ruby|Emerald|Pearl", desc, re.I):
            for line in computed_facts.get("remedy_candidates", {}).get("do_not_strengthen", []):
                planet = line.split()[0]
                if planet in desc:
                    issues.append(f"Elevated remedy mentions planet flagged do-not-strengthen: {line}")

    ok = not any("flagged" in i or "not in approved" in i for i in issues)
    return ok, issues
