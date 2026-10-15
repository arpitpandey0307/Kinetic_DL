# syntax=docker/dockerfile:1

# ---- build: compile TypeScript ------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----------------------------------------------------------------
FROM node:22-bookworm-slim
WORKDIR /app

# ffmpeg merges video+audio and converts audio; curl/certs fetch yt-dlp
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Standalone yt-dlp build (bundles Python, mutagen and the YouTube JS solver).
# A rebuild always picks up the latest release, which sites frequently require.
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && yt-dlp --version

ENV NODE_ENV=production \
    PORT=10000 \
    YTDLP_PATH=/usr/local/bin/yt-dlp \
    YTDLP_JS_RUNTIMES=node \
    DOWNLOAD_DIR=/app/downloads

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY public ./public

RUN mkdir -p /app/downloads && chown -R node:node /app/downloads
USER node

EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
