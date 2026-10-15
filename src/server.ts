import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { loadConfig } from './config';
import { createAdapterRegistry } from './adapters';
import { createApp } from './app';
import { MediaExtractor } from './services/MediaExtractor';
import { DownloadManager } from './services/DownloadManager';
import { ProgressTracker } from './services/ProgressTracker';
import { TeraBoxExtractor } from './services/TeraBoxExtractor';
import { YtDlp } from './services/YtDlp';

const config = loadConfig();

/** Resolve the ffmpeg binary from FFMPEG_LOCATION (a file or a directory) */
function resolveFfmpeg(location: string): string {
  if (!location) return 'ffmpeg';
  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  try {
    if (fs.statSync(location).isDirectory()) return path.join(location, exe);
  } catch {
    // not a path on disk; treat as a command name
  }
  return location;
}

/**
 * yt-dlp rewrites its cookie jar, so copy it somewhere writable. Accepts a
 * file path (YTDLP_COOKIES_FILE, e.g. a Render secret file) or raw
 * Netscape-format content (YTDLP_COOKIES).
 */
function prepareCookies(): string {
  const target = path.join(os.tmpdir(), 'kinetic-dl-cookies.txt');
  try {
    if (process.env.YTDLP_COOKIES) {
      fs.writeFileSync(target, process.env.YTDLP_COOKIES, { mode: 0o600 });
      return target;
    }
    if (config.ytdlpCookiesFile && fs.existsSync(config.ytdlpCookiesFile)) {
      fs.copyFileSync(config.ytdlpCookiesFile, target);
      fs.chmodSync(target, 0o600);
      return target;
    }
  } catch (e) {
    console.warn('Could not prepare yt-dlp cookies:', (e as Error).message);
  }
  return '';
}

function commandVersion(cmd: string, args: string[]): Promise<string | null> {
  return new Promise(resolve => {
    try {
      const child = spawn(cmd, args, { windowsHide: true });
      let out = '';
      const timer = setTimeout(() => child.kill(), 10_000);
      child.stdout.on('data', d => (out += d.toString()));
      child.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
      child.on('close', code => {
        clearTimeout(timer);
        resolve(code === 0 ? out.split('\n')[0].trim() : null);
      });
    } catch {
      resolve(null);
    }
  });
}

const ffmpegPath = resolveFfmpeg(config.ffmpegLocation);
const adapterRegistry = createAdapterRegistry();
const ytdlp = new YtDlp({
  binary: config.ytdlpPath,
  ffmpegLocation: config.ffmpegLocation,
  jsRuntimes: config.ytdlpJsRuntimes,
  cookiesFile: prepareCookies()
});
const mediaExtractor = new MediaExtractor(adapterRegistry, ytdlp, config.analyzeTimeoutMs);
const teraBoxExtractor = new TeraBoxExtractor(ffmpegPath);
const progressTracker = new ProgressTracker();
const downloadManager = new DownloadManager({
  adapterRegistry,
  progressTracker,
  teraBoxExtractor,
  ytdlp,
  downloadDir: config.downloadDir,
  maxConcurrent: config.maxConcurrentDownloads,
  maxQueueLength: config.maxQueueLength,
  maxFileSize: config.maxFileSize,
  fileTtlMs: config.fileTtlMs,
  downloadTimeoutMs: config.downloadTimeoutMs,
  formatLookup: (url, formatId) => mediaExtractor.getCachedFormat(url, formatId)
});

const toolVersions = Promise.all([
  ytdlp.version(),
  commandVersion(ffmpegPath, ['-version'])
]).then(([ytdlpVersion, ffmpegVersion]) => ({ ytdlpVersion, ffmpegVersion }));

const app = createApp({
  config,
  adapterRegistry,
  mediaExtractor,
  downloadManager,
  progressTracker,
  teraBoxExtractor,
  ytdlp,
  healthCheck: async () => {
    const { ytdlpVersion, ffmpegVersion } = await toolVersions;
    return {
      ytdlp: ytdlpVersion ? { available: true, version: ytdlpVersion } : { available: false },
      ffmpeg: ffmpegVersion ? { available: true, version: ffmpegVersion } : { available: false }
    };
  }
});

const purged = downloadManager.purgeOrphans();
if (purged > 0) console.log(`Removed ${purged} leftover download folder(s) from a previous run`);

const cleanupTimer = setInterval(() => {
  const removed = downloadManager.cleanupSessions();
  if (removed > 0) console.log(`Cleaned up ${removed} expired session(s)`);
  const heapMb = process.memoryUsage().heapUsed / 1024 / 1024;
  if (heapMb > 400) console.warn(`High memory usage: ${heapMb.toFixed(0)}MB heap`);
}, 60_000);
cleanupTimer.unref();

const server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Downloads directory: ${config.downloadDir}`);
  console.log(`Supported platforms: ${adapterRegistry.getAllAdapters().map(a => a.name).join(', ')}`);
  toolVersions.then(({ ytdlpVersion, ffmpegVersion }) => {
    console.log(`yt-dlp: ${ytdlpVersion || 'NOT FOUND (set YTDLP_PATH)'}`);
    console.log(`ffmpeg: ${ffmpegVersion || 'NOT FOUND (set FFMPEG_LOCATION)'}`);
  });
});

// SSE connections are long-lived; keep the socket timeouts generous
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  downloadManager.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason));

export default app;
