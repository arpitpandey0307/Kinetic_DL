# Deploying KINETIC_DL

KINETIC_DL runs long yt-dlp/ffmpeg processes, streams progress over
Server-Sent Events and stores files on disk for a while. It therefore needs a
**long-running container or VM**. Serverless platforms such as Vercel or
Netlify Functions cannot run it.

The repository ships a `Dockerfile` that bundles Node 22, ffmpeg and the latest
yt-dlp. Every option below uses it except the "no Docker" one.

## Render (Blueprint)

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` creates a Docker
   web service with a health check on `/api/health`.
3. Optional secrets (set in the dashboard):
   - `TERABOX_COOKIE`: logged-in TeraBox `ndus` cookie for full TeraBox downloads.
   - `YTDLP_COOKIES`: contents of a Netscape `cookies.txt`, if YouTube answers
     "Sign in to confirm you're not a bot" (common on datacenter IPs).
4. Open `https://<service>.onrender.com/api/health` and check that `ytdlp` and
   `ffmpeg` both report `available: true`.

> An **existing** Render service created as a native *Node* service does not
> switch to Docker on its own. Either recreate it from the Blueprint, or change
> the runtime to Docker in its settings. If you must stay on the Node runtime,
> use `chmod +x build.sh && ./build.sh` as the build command and set
> `YTDLP_PATH=./bin/yt-dlp`, `FFMPEG_LOCATION=./bin` and `YTDLP_JS_RUNTIMES=node`.

## Railway

`railway.toml` tells Railway to build the `Dockerfile`. Create a project from the
GitHub repo and it deploys automatically. Set the same optional secrets as above.

## Any Docker host (VPS, Fly.io, etc.)

```bash
docker build -t kinetic-dl .
docker run -d --name kinetic-dl -p 10000:10000 \
  -e MAX_CONCURRENT_DOWNLOADS=2 \
  --restart unless-stopped kinetic-dl
```

Put it behind a reverse proxy (Caddy/nginx) for HTTPS, and set `TRUST_PROXY=1`.
If you use nginx, disable buffering for `/api/progress/` so progress events
arrive live (`proxy_buffering off;`). The app also sends `X-Accel-Buffering: no`.

## Configuration reference

All settings are environment variables. See `.env.example` for the full list
with defaults. The ones that matter most in production:

| Variable | Default | Purpose |
|---|---|---|
| `MAX_CONCURRENT_DOWNLOADS` | `3` | Parallel downloads; lower it on small instances |
| `MAX_FILE_SIZE` | 2 GiB | Downloads larger than this are refused |
| `FILE_TTL_MS` | 1 hour | Finished files are deleted after this |
| `RATE_LIMIT_MAX_REQUESTS` / `DOWNLOAD_RATE_LIMIT_MAX` | 300 / 30 | Per-IP limits per window |
| `TRUST_PROXY` | 1 in production | Hops of reverse proxies, for correct client IPs |
| `ALLOW_PRIVATE_NETWORKS` | `false` | Keep `false` on public servers (SSRF protection) |

## Operational notes

- **Storage is temporary by design.** Files live in `DOWNLOAD_DIR` until
  `FILE_TTL_MS` expires and are removed on restart. Users get the file through
  their browser; download history lives in their browser's localStorage.
- **Keep yt-dlp current.** Sites change often. Rebuilding the image fetches the
  newest yt-dlp release.
- **Platform blocks are not app bugs.** YouTube may bot-check datacenter IPs and
  TeraBox limits anonymous users to previews. Supply cookies as described above.
- Health check: `GET /api/health` reports tool versions and queue stats.
