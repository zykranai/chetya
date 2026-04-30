# Chetya API — production image (FastAPI + Swiss Ephemeris).
# Build from repo root: docker build -t chetya-api .
# Run: docker run -p 8000:8000 -e DATABASE_URL=... -e CHETYA_JWT_SECRET=... chetya-api

FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend /app/backend
COPY scripts /app/scripts

ENV PYTHONPATH=/app
EXPOSE 8000

# Render / Fly / Railway set PORT; default 8000 for local docker run.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
