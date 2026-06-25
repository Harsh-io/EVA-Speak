FROM python:3.12-slim

WORKDIR /app

ENV HF_HOME=/app/.cache/huggingface
ENV XDG_CACHE_HOME=/app/.cache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
        nodejs \
        npm \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt package.json package-lock.json ./

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && npm ci --omit=dev

COPY app ./app
COPY backend ./backend

RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny.en', device='cpu', compute_type='int8')"

ENV EVA_MODEL_SIZE=tiny.en
ENV PORT=10000

EXPOSE 10000

CMD ["npm", "start"]
