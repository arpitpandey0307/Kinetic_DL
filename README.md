<div align="center">

# ⚡ KINETIC_DL

### Multi-Platform Video Downloader & Streamer

![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![yt--dlp](https://img.shields.io/badge/yt--dlp-Powered-FF0000?style=for-the-badge)

<p>A cyberpunk-themed, multi-platform video downloader with in-app streaming, hacker-style UI, and universal platform support.</p>

</div>

---

## 🎯 Features

- **Universal platform support**: YouTube, Instagram, TikTok, Twitter/X, Facebook, Reddit, Pinterest, Vimeo, TeraBox, and 1000+ more sites via yt-dlp
- **Quality selection**: one option per resolution (144p to 4K), preferring browser-friendly H.264
- **Audio-only mode**: MP3 at 320 kbps or lossless FLAC, with embedded title/artist metadata and cover art
- **Live progress**: progress bar, size, speed and ETA over Server-Sent Events, with automatic polling fallback
- **Download queue**: concurrent-download limit with a waiting queue, and cancel at any stage
- **In-app player**: stream the source or play finished downloads with seeking (HTTP Range)
- **History**: the last transfers stay in the browser, including failed ones with their error; cards show when the server copy has expired
- **Clear errors**: typed error codes with a RETRY button for transient failures (3 attempts)
- **Hardened server**: SSRF protection, rate limiting, input validation, CSP and security headers, file size limits, automatic file cleanup
- **Smooth motion**: eased transitions and entrance animations that respect `prefers-reduced-motion`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 22, Express, TypeScript |
| **Frontend** | HTML5, vanilla JS, Tailwind CSS (CDN), hls.js |
| **Video engine** | yt-dlp, FFmpeg |
| **Streaming** | Server-Sent Events, HTTP Range requests |
| **Storage** | Temporary files on the server, history in localStorage |
| **Tests** | Node's built-in test runner (`node:test`) |

---

## 📋 Prerequisites

1. **Node.js 22+**
2. **yt-dlp**: the extraction engine ([releases](https://github.com/yt-dlp/yt-dlp/releases))
   ```bash
   pip install -U "yt-dlp[default]"   # or download the standalone binary
   ```
3. **FFmpeg**: merges video+audio and converts audio
   ```bash
   winget install Gyan.FFmpeg    # Windows
   brew install ffmpeg           # macOS
   sudo apt install ffmpeg       # Debian/Ubuntu
   ```

If they are not on your `PATH`, point `YTDLP_PATH` / `FFMPEG_LOCATION` at them.
`GET /api/health` shows whether the server can find both.

---

## 🚀 Getting Started

```bash
git clone https://github.com/arpitpandey0307/Kinetic_DL.git
cd Kinetic_DL
npm install
cp .env.example .env     # optional: adjust settings
npm run dev              # or: npm run build && npm start
```

Open http://localhost:3000 and click **INITIALIZE DASHBOARD**.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the server with ts-node |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm test` | Compile and run the test suite |
| `npm run typecheck` | Type-check without emitting |

---

## 📁 Project Structure

```
Kinetic_DL/
├── public/                     # Frontend (served statically)
│   ├── index.html              # Landing page
│   ├── dashboard.html          # Downloader dashboard
│   ├── css/motion.css          # Animation layer
│   └── js/
│       ├── app.js              # UI controller, player, history, toasts
│       └── motion.js           # Scroll reveals and transition hooks
├── src/
│   ├── server.ts               # Bootstrap: wiring, cleanup timers, shutdown
│   ├── app.ts                  # Express app and all API routes
│   ├── config.ts               # Environment configuration
│   ├── adapters/               # Platform recognition + yt-dlp arguments
│   ├── services/
│   │   ├── YtDlp.ts            # yt-dlp process wrapper
│   │   ├── MediaExtractor.ts   # Metadata analysis, quality options, cache
│   │   ├── DownloadManager.ts  # Queue, execution, cancel, file lifecycle
│   │   ├── ProgressTracker.ts  # Live progress fan-out (SSE)
│   │   └── TeraBoxExtractor.ts # TeraBox links, HLS remux
│   ├── utils/                  # URL parsing, SSRF guard, rate limit, errors
│   └── types/
├── test/                       # node:test suites
├── Dockerfile                  # Production image (Node + ffmpeg + yt-dlp)
├── render.yaml / railway.toml  # Hosting configs
└── DEPLOYMENT.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Status, yt-dlp/ffmpeg availability, queue stats |
| `POST` | `/api/analyze` | `{ url }` → title, thumbnail, quality options |
| `POST` | `/api/download` | `{ url, formatId?, audioOnly?, audioFormat? }` → `202 { sessionId }` |
| `GET` | `/api/progress/:sessionId` | SSE stream of progress, ends with a `complete` event |
| `GET` | `/api/sessions/:sessionId` | Current session state (polling fallback) |
| `POST` | `/api/cancel/:sessionId` | Cancel a queued or running download |
| `GET` | `/api/download/:sessionId/file` | Download the finished file |
| `GET` | `/api/stream/:sessionId/file` | Play the finished file inline (Range support) |
| `GET` | `/api/stream?url=` | Direct playable URL for the in-app preview |
| `GET` | `/api/terabox-stream?url=` | HLS playlist for TeraBox previews |
| `GET` | `/api/history?ids=a,b` | Which of the given sessions still have files |

Errors share one shape: `{ success: false, error: { code, message, retryable, details? } }`.

---

## ⚙️ Configuration

Every setting is an environment variable. The full list with defaults is in
[`.env.example`](.env.example). The common ones:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `YTDLP_PATH` / `FFMPEG_LOCATION` | from `PATH` | Tool locations |
| `DOWNLOAD_DIR` | `./downloads` | Temporary file storage |
| `MAX_CONCURRENT_DOWNLOADS` | `3` | Parallel downloads (the rest queue) |
| `MAX_FILE_SIZE` | 2 GiB | Larger downloads are refused |
| `FILE_TTL_MS` | 1 hour | How long finished files are kept |
| `TERABOX_COOKIE` | empty | Logged-in TeraBox cookie for full TeraBox downloads |

---

## 🧪 How It Works

1. **Analyze**: the URL is validated (syntax, platform, public host), then yt-dlp extracts metadata and formats.
2. **Select**: the user picks a resolution, or audio-only as MP3/FLAC.
3. **Download**: the request joins a queue. yt-dlp downloads into a per-session folder, FFmpeg merges to MP4/AAC or converts the audio, and progress streams to the browser.
4. **Deliver**: the browser saves the file automatically. It can also be played in-app until the server copy expires.
5. **History**: each transfer is recorded in localStorage with play/save/retry actions.

### Platform notes

- **YouTube** may ask datacenter IPs to "confirm you're not a bot". Provide cookies through `YTDLP_COOKIES` (see [DEPLOYMENT.md](DEPLOYMENT.md)).
- **TeraBox** only serves short previews to anonymous visitors. Set `TERABOX_COOKIE` for full downloads. Without it the app says so clearly instead of saving a clip.

---

## ☁️ Deployment

Needs a long-running container (Render, Railway, any Docker host). Serverless
platforms such as Vercel cannot run it. See **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run `npm test`
4. Commit your changes and open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

<div align="center">

**Built with ⚡ by [Arpit Pandey](https://github.com/arpitpandey0307)**

</div>
