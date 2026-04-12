<div align="center">

# ⚡ KINETIC_DL

### Multi-Platform Video Downloader & Streamer

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![yt--dlp](https://img.shields.io/badge/yt--dlp-Powered-FF0000?style=for-the-badge)

<p>A cyberpunk-themed, multi-platform video downloader with in-app streaming, hacker-style UI, and universal platform support.</p>

</div>

---

## 🎯 Features

- **Universal Platform Support** — Download videos from YouTube, Instagram, TikTok, Twitter/X, Facebook, Reddit, Pinterest, Vimeo, and 1000+ more sites via yt-dlp
- **In-App Video Player** — Stream and play videos directly in the browser without downloading
- **Multiple Quality Options** — Choose from all available resolutions (360p to 4K)
- **Audio-Only Mode** — Extract just the audio track from any video
- **Hacker-Themed UI** — Cyberpunk design with matrix rain loading animation, terminal logs, and live telemetry
- **Real-Time Progress** — Server-Sent Events (SSE) for live download progress tracking
- **Download History** — Persistent history with play, save, and delete functionality
- **AAC Audio Encoding** — All downloads are merged with AAC audio for universal playback compatibility

---

## 🖥️ Screenshots

### Dashboard
The main dashboard with signal extraction input, quality selection, and live system telemetry.

### Hacker Loading Overlay
Full-screen "GETTING THE SYSTEM ACCESS" animation with matrix rain, terminal logs, and progress tracking.

### In-App Video Player
Stream videos directly in the browser with a full-featured HTML5 video player modal.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js, TypeScript |
| **Frontend** | HTML5, Vanilla JS, Tailwind CSS |
| **Video Engine** | yt-dlp, FFmpeg |
| **Streaming** | Server-Sent Events (SSE), HTTP Range Requests |
| **Storage** | Local filesystem, localStorage |

---

## 📋 Prerequisites

Before running Kinetic_DL, make sure you have the following installed:

1. **Node.js** (v18 or higher)
   ```
   node --version
   ```

2. **yt-dlp** — The core video extraction engine
   ```bash
   # Windows (via pip)
   pip install yt-dlp

   # Or download the binary from:
   # https://github.com/yt-dlp/yt-dlp/releases
   ```

3. **FFmpeg** — Required for merging video and audio streams
   ```bash
   # Windows (via chocolatey)
   choco install ffmpeg

   # Or download from:
   # https://ffmpeg.org/download.html
   ```

> **⚠️ Important:** Both `yt-dlp` and `ffmpeg` must be available in your system PATH.

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/arpitpandey0307/Kinetic_DL.git
cd Kinetic_DL
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Open in Browser
```
http://localhost:3000
```

The landing page will load. Click **"INITIALIZE DASHBOARD"** to access the main downloader interface.

---

## 📁 Project Structure

```
Kinetic_DL/
├── public/                     # Frontend static files
│   ├── index.html              # Landing page
│   ├── dashboard.html          # Main downloader dashboard
│   ├── css/
│   │   └── index.css           # Global styles & design tokens
│   └── js/
│       └── app.js              # Frontend controller (UI logic)
│
├── src/                        # Backend TypeScript source
│   ├── server.ts               # Express server & API routes
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── adapters/               # Platform-specific adapters
│   │   ├── index.ts            # Adapter registry
│   │   ├── YouTubeAdapter.ts   # YouTube-specific logic
│   │   ├── InstagramAdapter.ts # Instagram-specific logic
│   │   ├── TikTokAdapter.ts    # TikTok-specific logic
│   │   ├── GenericAdapter.ts   # Fallback for any URL
│   │   └── OtherAdapters.ts    # Twitter, Facebook, Reddit, etc.
│   ├── services/
│   │   ├── MediaExtractor.ts   # yt-dlp metadata extraction
│   │   ├── DownloadManager.ts  # Download queue & execution
│   │   └── ProgressTracker.ts  # Real-time progress via SSE
│   └── utils/
│       └── URLParser.ts        # URL validation & platform detection
│
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Extract video metadata from a URL |
| `POST` | `/api/download` | Start a video download |
| `GET` | `/api/progress/:sessionId` | SSE stream for download progress |
| `GET` | `/api/download/:sessionId/file` | Download the completed file |
| `GET` | `/api/stream?url=` | Get direct stream URL for in-app playback |
| `GET` | `/api/stream/:sessionId/file` | Stream a downloaded file with seeking support |
| `POST` | `/api/cancel/:sessionId` | Cancel an active download |
| `GET` | `/api/history` | Get download history |

---

## 🎨 UI Features

### Hacker Loading Overlay
When extracting video metadata, a full-screen cyberpunk overlay appears with:
- **Matrix rain** canvas animation
- **Terminal log stream** with realistic system messages
- **Progress bar** with percentage tracking
- **Elapsed timer**

### System Telemetry
The dashboard footer displays live system metrics:
- **Vector Map** — Animated orbital rings with randomizing signal power (dBm)
- **Kernel Log Stream** — Continuously flowing terminal-style log entries
- **Frequency Scanner** — Animated bar chart
- **Geo Sync** — Satellite lock visualization

### Video Player Modal
In-app video playback with:
- Full-screen modal overlay
- HTML5 `<video>` element with native controls
- HTTP Range request support for seeking
- Loading spinner with stream status
- Close button and keyboard (Escape) support

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DOWNLOAD_DIR` | `./downloads` | Where downloaded files are stored |
| `MAX_CONCURRENT` | `3` | Maximum concurrent downloads |

---

## 🧪 How It Works

1. **URL Analysis** — User pastes a URL → backend uses yt-dlp to extract metadata (title, thumbnail, available formats)
2. **Format Selection** — User picks quality/resolution from the extracted formats
3. **Download** — yt-dlp downloads the video with `bestaudio` merged via FFmpeg into MP4 with AAC audio
4. **Streaming** — Files can be played in-app via the `/api/stream` endpoints, or downloaded to local disk
5. **History** — All downloads are saved to localStorage with play/save/delete options

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ⚡ by [Arpit Pandey](https://github.com/arpitpandey0307)**

</div>
