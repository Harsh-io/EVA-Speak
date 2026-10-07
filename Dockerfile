# ── Stage 1: Build frontend ─────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY frontend ./frontend
COPY backend ./backend

RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Cache dirs for HuggingFace / matplotlib
ENV HF_HOME=/app/.cache/huggingface
ENV XDG_CACHE_HOME=/app/.cache
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Python deps (cached layer)
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Node deps (production only)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy app source
COPY app ./app
COPY backend ./backend

# Copy built frontend from stage 1
COPY --from=frontend-builder /build/dist ./dist

# Pre-download Whisper model at build time to avoid cold-start latency
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny.en', device='cpu', compute_type='int8')"

ENV EVA_MODEL_SIZE=tiny.en
ENV PORT=10000
ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "backend/server.js"]
