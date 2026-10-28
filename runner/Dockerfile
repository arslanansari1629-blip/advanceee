# BotForge runner — keeps user Python bots alive 24/7
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    BOTFORGE_DATA=/data

# System deps many Telegram bots need (crypto, image, audio, build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential git curl ffmpeg libssl-dev libffi-dev \
      libjpeg-dev zlib1g-dev libpng-dev libwebp-dev libxml2-dev libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY host.py .

# Pre-warm the wheels almost every bot needs, so first deploys are instant
RUN pip install --no-cache-dir \
      python-dotenv requests aiohttp httpx certifi urllib3 \
      "python-telegram-bot>=21.6" pyTelegramBotAPI aiogram pyrogram TgCrypto telethon \
    || true

VOLUME ["/data"]
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import os,urllib.request;urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8081')+'/health',timeout=4)" || exit 1

CMD ["python", "host.py"]
