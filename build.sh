#!/bin/bash
set -e

echo "Installing npm dependencies..."
npm install

echo "Installing yt-dlp..."
# Install yt-dlp to a local directory
mkdir -p ./bin
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ./bin/yt-dlp
chmod a+rx ./bin/yt-dlp

echo "Building TypeScript..."
npm run build

echo "Build complete! yt-dlp installed at ./bin/yt-dlp"
