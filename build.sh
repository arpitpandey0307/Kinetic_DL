#!/usr/bin/env bash
# Build for hosts WITHOUT Docker (e.g. a Render "Node" native service).
# Installs yt-dlp and a static ffmpeg into ./bin, then compiles TypeScript.
# Start command: npm start
# Required env vars: YTDLP_PATH=./bin/yt-dlp FFMPEG_LOCATION=./bin YTDLP_JS_RUNTIMES=node
set -euo pipefail

echo "Installing npm dependencies..."
npm ci

mkdir -p ./bin

echo "Installing yt-dlp..."
curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o ./bin/yt-dlp
chmod a+rx ./bin/yt-dlp
./bin/yt-dlp --version

if ! command -v ffmpeg >/dev/null 2>&1 && [ ! -x ./bin/ffmpeg ]; then
  echo "Installing static ffmpeg..."
  curl -fsSL https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz -o /tmp/ffmpeg.tar.xz
  tar -xJf /tmp/ffmpeg.tar.xz -C /tmp
  cp /tmp/ffmpeg-master-latest-linux64-gpl/bin/ffmpeg /tmp/ffmpeg-master-latest-linux64-gpl/bin/ffprobe ./bin/
  rm -rf /tmp/ffmpeg.tar.xz /tmp/ffmpeg-master-latest-linux64-gpl
fi

echo "Building TypeScript..."
npm run build

echo "Build complete."
