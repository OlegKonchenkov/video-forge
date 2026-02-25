FROM node:20-bookworm-slim

WORKDIR /app

# Runtime tools needed by the worker (rendering + media processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    dumb-init \
    ffmpeg \
    fonts-liberation \
    fonts-noto \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Install monorepo dependencies and build worker TS output
RUN npm ci \
    && npm ci --prefix agentforge-video \
    && npm run build --workspace=apps/worker \
    && npm prune --omit=dev

RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app /home/appuser

USER appuser
WORKDIR /app/apps/worker

ENV NODE_ENV=production
ENV CHROME_BIN=/usr/bin/chromium
ENTRYPOINT ["dumb-init", "--"]
