#!/bin/bash
# Install dependencies
npm install

# Install yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /opt/render/project/src/yt-dlp
chmod a+rx /opt/render/project/src/yt-dlp

# Build TypeScript
npm run build

echo "Build complete! yt-dlp installed at /opt/render/project/src/yt-dlp"
