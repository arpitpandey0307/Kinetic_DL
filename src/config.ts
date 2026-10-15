import path from 'path';

// Central runtime configuration. Every tunable is read from the environment
// here so the rest of the code never touches process.env directly.

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

function list(name: string): string[] {
  return (process.env[name] || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/** Accept either a full cookie header or just the value of the "ndus" cookie */
function normalizeTeraboxCookie(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  return value.includes('=') ? value : `ndus=${value}`;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  downloadDir: string;
  ytdlpPath: string;
  ffmpegLocation: string;
  ytdlpJsRuntimes: string[];
  ytdlpCookiesFile: string;
  teraboxCookie: string;
  maxConcurrentDownloads: number;
  maxQueueLength: number;
  maxFileSize: number;
  fileTtlMs: number;
  analyzeTimeoutMs: number;
  downloadTimeoutMs: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  downloadRateLimitMax: number;
  corsOrigins: string[];
  trustProxy: number;
  allowPrivateNetworks: boolean;
}

export function loadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  return {
    port: int('PORT', 3000),
    nodeEnv,
    downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads'),
    ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
    ffmpegLocation: process.env.FFMPEG_LOCATION || '',
    // e.g. "node" or "deno" — YouTube needs a JS runtime for signature solving
    ytdlpJsRuntimes: list('YTDLP_JS_RUNTIMES'),
    ytdlpCookiesFile: process.env.YTDLP_COOKIES_FILE || '',
    teraboxCookie: normalizeTeraboxCookie(process.env.TERABOX_COOKIE || ''),
    maxConcurrentDownloads: Math.max(1, int('MAX_CONCURRENT_DOWNLOADS', 3)),
    maxQueueLength: Math.max(0, int('MAX_QUEUE_LENGTH', 20)),
    maxFileSize: int('MAX_FILE_SIZE', 2 * 1024 * 1024 * 1024),
    fileTtlMs: int('FILE_TTL_MS', 60 * 60 * 1000),
    analyzeTimeoutMs: int('ANALYZE_TIMEOUT_MS', 60 * 1000),
    downloadTimeoutMs: int('DOWNLOAD_TIMEOUT_MS', 30 * 60 * 1000),
    rateLimitWindowMs: int('RATE_LIMIT_WINDOW', 15 * 60 * 1000),
    rateLimitMaxRequests: int('RATE_LIMIT_MAX_REQUESTS', 300),
    downloadRateLimitMax: int('DOWNLOAD_RATE_LIMIT_MAX', 30),
    corsOrigins: list('CORS_ORIGIN').filter(o => o !== '*'),
    trustProxy: int('TRUST_PROXY', nodeEnv === 'production' ? 1 : 0),
    allowPrivateNetworks: bool('ALLOW_PRIVATE_NETWORKS', false)
  };
}
