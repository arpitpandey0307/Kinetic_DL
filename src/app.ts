import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import path from 'path';
import { AppConfig } from './config';
import { AdapterRegistry } from './adapters';
import { MediaExtractor } from './services/MediaExtractor';
import { DownloadManager, QueueFullError, SESSION_ID_PATTERN } from './services/DownloadManager';
import { ProgressTracker } from './services/ProgressTracker';
import { TeraBoxExtractor } from './services/TeraBoxExtractor';
import { YtDlp } from './services/YtDlp';
import { URLParser } from './utils/URLParser';
import { assertPublicUrl, Resolver } from './utils/urlSafety';
import { rateLimit } from './utils/rateLimit';
import { classifyError } from './utils/errors';
import { DownloadProgress, TERMINAL_STATUSES } from './types';

export interface AppDeps {
  config: AppConfig;
  adapterRegistry: AdapterRegistry;
  mediaExtractor: MediaExtractor;
  downloadManager: DownloadManager;
  progressTracker: ProgressTracker;
  teraBoxExtractor: TeraBoxExtractor;
  ytdlp: YtDlp;
  /** Reports external tool availability for /api/health */
  healthCheck?: () => Promise<Record<string, unknown>>;
  /** Override DNS resolution (tests) */
  resolver?: Resolver;
  /** Directory of static frontend files */
  publicDir?: string;
}

const FORMAT_ID_PATTERN = /^[A-Za-z0-9_.+-]{1,64}$/;
const SSE_HEARTBEAT_MS = 15_000;

function apiError(res: Response, status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return res.status(status).json({ success: false, error: { code, message, ...extra } });
}

/** Wrap async handlers so rejections reach the error middleware */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Tailwind's CDN build needs its inline config block
      "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  );
  next();
}

export function createApp(deps: AppDeps) {
  const { config, downloadManager, progressTracker, mediaExtractor, teraBoxExtractor, ytdlp } = deps;
  const urlParser = new URLParser(deps.adapterRegistry);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders);
  if (config.corsOrigins.length > 0) app.use('/api', cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '16kb' }));

  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/')) console.log(`${new Date().toISOString()} ${req.ip} ${req.method} ${req.path}`);
    next();
  });

  app.use(express.static(deps.publicDir || path.join(__dirname, '..', 'public'), { maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));

  const generalLimiter = rateLimit({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMaxRequests, name: 'requests' });
  const downloadLimiter = rateLimit({ windowMs: config.rateLimitWindowMs, max: config.downloadRateLimitMax, name: 'downloads' });
  app.use('/api', generalLimiter);

  /** Validate a user-supplied URL: syntax, supported platform, public host */
  async function validateUrl(raw: unknown, res: Response): Promise<string | null> {
    if (typeof raw !== 'string' || !raw.trim()) {
      apiError(res, 400, 'INVALID_REQUEST', 'URL is required');
      return null;
    }
    const url = raw.trim();
    const parsed = urlParser.parse(url);
    if (!parsed.isValid) {
      apiError(res, 400, 'INVALID_URL', parsed.error || 'Invalid URL', { retryable: false });
      return null;
    }
    const safety = await assertPublicUrl(url, { allowPrivate: config.allowPrivateNetworks, resolver: deps.resolver });
    if (!safety.ok) {
      apiError(res, 400, 'INVALID_URL', safety.reason || 'URL not allowed', { retryable: false });
      return null;
    }
    return url;
  }

  function validSessionId(req: Request, res: Response): string | null {
    const { sessionId } = req.params;
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      apiError(res, 404, 'NOT_FOUND', 'Session not found');
      return null;
    }
    return sessionId;
  }

  app.get('/api/health', asyncHandler(async (_req, res) => {
    const tools = deps.healthCheck ? await deps.healthCheck() : {};
    res.json({
      success: true,
      status: 'ok',
      uptime: Math.round(process.uptime()),
      downloads: downloadManager.getStats(),
      config: {
        fileTtlMinutes: Math.round(config.fileTtlMs / 60000),
        maxFileSizeMb: config.maxFileSize > 0 ? Math.round(config.maxFileSize / 1024 / 1024) : null
      },
      ...tools
    });
  }));

  // POST /api/analyze - Analyze URL and return available formats
  app.post('/api/analyze', asyncHandler(async (req, res) => {
    const url = await validateUrl(req.body?.url, res);
    if (!url) return;

    if (TeraBoxExtractor.isTeraBoxUrl(url)) {
      const tbResult = await teraBoxExtractor.extract(url);
      if (!tbResult.success) {
        return apiError(res, 400, 'VIDEO_NOT_FOUND', tbResult.error || 'Could not read TeraBox link', { retryable: true });
      }
      const qualities = tbResult.files.map((f, i) => ({
        label: tbResult.files.length > 1 ? `FILE_${i + 1}` : 'ORIGINAL',
        resolution: f.filename,
        formatId: `terabox-${i}`,
        codec: path.extname(f.filename).replace('.', '').toUpperCase() || 'FILE',
        container: path.extname(f.filename).replace('.', '') || 'bin',
        filesize: f.size,
        hasAudio: true
      }));
      return res.json({
        success: true,
        data: {
          success: true,
          platform: 'terabox',
          metadata: {
            title: tbResult.title || tbResult.files[0].filename,
            thumbnail: tbResult.thumbnail || '',
            duration: 0,
            formats: []
          },
          availableQualities: qualities,
          audioAvailable: false
        }
      });
    }

    const result = await mediaExtractor.analyze(url);
    if (!result.success) {
      const status = result.error?.code === 'DEPENDENCY_MISSING' ? 503 : 400;
      return res.status(status).json({ success: false, error: result.error });
    }

    // Don't ship the raw format list to the browser — it can be megabytes
    res.json({
      success: true,
      data: {
        success: true,
        platform: result.platform,
        metadata: { ...result.metadata, formats: [] },
        availableQualities: result.availableQualities,
        audioAvailable: true
      }
    });
  }));

  // POST /api/download - Queue a download
  app.post('/api/download', downloadLimiter, asyncHandler(async (req, res) => {
    const { formatId, audioOnly, audioFormat } = req.body || {};
    const url = await validateUrl(req.body?.url, res);
    if (!url) return;

    if (formatId !== undefined && formatId !== '' && (typeof formatId !== 'string' || !FORMAT_ID_PATTERN.test(formatId))) {
      return apiError(res, 400, 'INVALID_REQUEST', 'Invalid format id');
    }
    if (audioOnly !== undefined && typeof audioOnly !== 'boolean') {
      return apiError(res, 400, 'INVALID_REQUEST', 'audioOnly must be a boolean');
    }
    if (audioFormat !== undefined && audioFormat !== 'mp3' && audioFormat !== 'flac') {
      return apiError(res, 400, 'INVALID_REQUEST', 'audioFormat must be "mp3" or "flac"');
    }
    if (!formatId && !audioOnly) {
      return apiError(res, 400, 'INVALID_REQUEST', 'Format selection is required');
    }
    if (audioOnly && TeraBoxExtractor.isTeraBoxUrl(url)) {
      return apiError(res, 400, 'INVALID_REQUEST', 'Audio extraction is not available for TeraBox files');
    }

    try {
      const session = downloadManager.startDownload({ url, formatId: formatId || 'best', audioOnly: !!audioOnly, audioFormat });
      res.status(202).json({ success: true, sessionId: session.sessionId, status: session.status });
    } catch (e) {
      if (e instanceof QueueFullError) {
        res.setHeader('Retry-After', '30');
        return apiError(res, 503, 'QUEUE_FULL', e.message, { retryable: true });
      }
      throw e;
    }
  }));

  // GET /api/progress/:sessionId - SSE stream of progress updates
  app.get('/api/progress/:sessionId', (req, res) => {
    const sessionId = validSessionId(req, res);
    if (!sessionId) return;
    if (!downloadManager.getSession(sessionId)) return apiError(res, 404, 'NOT_FOUND', 'Session not found');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 3000\n\n');
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    let closed = false;
    let unsubscribe: (() => void) | null = null;
    const heartbeat = setInterval(() => res.write(': ping\n\n'), SSE_HEARTBEAT_MS);

    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unsubscribe?.();
      res.end();
    };

    const onProgress = (progress: DownloadProgress) => {
      if (closed) return;
      res.write(`data: ${JSON.stringify({ type: 'progress', data: progress })}\n\n`);
      if (TERMINAL_STATUSES.has(progress.status)) {
        res.write(`data: ${JSON.stringify({ type: 'complete', data: progress })}\n\n`);
        // Defer so we never end the response from inside subscribe()
        setImmediate(close);
      }
    };

    unsubscribe = progressTracker.subscribe(sessionId, onProgress);
    if (closed) unsubscribe();
    req.on('close', close);
  });

  // GET /api/sessions/:sessionId - Current state of a session (polling fallback)
  app.get('/api/sessions/:sessionId', (req, res) => {
    const sessionId = validSessionId(req, res);
    if (!sessionId) return;
    const session = downloadManager.getSession(sessionId);
    if (!session) return apiError(res, 404, 'NOT_FOUND', 'Session not found or expired');
    res.json({ success: true, session });
  });

  // POST /api/cancel/:sessionId - Cancel a download
  app.post('/api/cancel/:sessionId', asyncHandler(async (req, res) => {
    const sessionId = validSessionId(req, res);
    if (!sessionId) return;
    if (!downloadManager.getSession(sessionId)) return apiError(res, 404, 'NOT_FOUND', 'Session not found');
    const cancelled = await downloadManager.cancelDownload(sessionId);
    res.json({ success: true, cancelled });
  }));

  // GET /api/download/:sessionId/file - Serve completed file as an attachment
  app.get('/api/download/:sessionId/file', (req, res, next) => {
    const sessionId = validSessionId(req, res);
    if (!sessionId) return;
    const session = downloadManager.getSession(sessionId);
    if (!session) return apiError(res, 404, 'NOT_FOUND', 'Session not found or file expired');
    const filePath = downloadManager.getFilePath(sessionId);
    if (!filePath) {
      return session.status === 'COMPLETED'
        ? apiError(res, 410, 'FILE_EXPIRED', 'File is no longer available')
        : apiError(res, 409, 'NOT_READY', 'Download not completed yet');
    }
    res.download(filePath, path.basename(filePath), err => {
      if (err && !res.headersSent) next(err);
    });
  });

  // GET /api/stream/:sessionId/file - Inline playback with Range support
  app.get('/api/stream/:sessionId/file', (req, res, next) => {
    const sessionId = validSessionId(req, res);
    if (!sessionId) return;
    const filePath = downloadManager.getFilePath(sessionId);
    if (!filePath) return apiError(res, 404, 'FILE_NOT_FOUND', 'File not found or expired');
    // express' sendFile handles Range/416/ETag correctly
    res.sendFile(filePath, { headers: { 'Content-Disposition': 'inline' } }, err => {
      if (err && !res.headersSent) next(err);
    });
  });

  // GET /api/stream?url= - Resolve a direct media URL for in-app playback
  app.get('/api/stream', asyncHandler(async (req, res) => {
    const url = await validateUrl(req.query.url, res);
    if (!url) return;

    if (TeraBoxExtractor.isTeraBoxUrl(url)) {
      return res.json({ success: true, streamUrl: `/api/terabox-stream?url=${encodeURIComponent(url)}`, isHLS: true });
    }

    try {
      const { stdout } = await ytdlp.run(
        ['-g', '-f', 'best[ext=mp4][vcodec!=none][acodec!=none]/best[vcodec!=none][acodec!=none]/best', '--no-warnings', '--no-playlist', '--', url],
        Math.min(config.analyzeTimeoutMs, 45_000)
      );
      const urls = stdout.trim().split(/\r?\n/).filter(u => /^https?:\/\//.test(u));
      if (urls.length === 0) return apiError(res, 404, 'NO_STREAM', 'No streamable URL found');
      res.json({ success: true, streamUrl: urls[0], isHLS: /\.m3u8(\?|$)/.test(urls[0]) });
    } catch (e) {
      const info = classifyError(e);
      if (info.code === 'FORMAT_UNAVAILABLE') {
        // The site only offers separate video/audio streams, which a browser can't play together
        return apiError(res, 404, 'NO_STREAM', 'This video has no single streamable file. Download it, then play it from Recent Transfers.', { retryable: false });
      }
      res.status(info.code === 'DEPENDENCY_MISSING' ? 503 : 502).json({ success: false, error: info });
    }
  }));

  // GET /api/terabox-stream?url= - HLS playlist for TeraBox playback
  app.get('/api/terabox-stream', asyncHandler(async (req, res) => {
    const url = typeof req.query.url === 'string' ? req.query.url : '';
    if (!TeraBoxExtractor.isTeraBoxUrl(url)) return apiError(res, 400, 'INVALID_REQUEST', 'Valid TeraBox URL required');

    const stream = await teraBoxExtractor.getM3U8StreamUrl(url);
    if (!stream) return apiError(res, 404, 'NO_STREAM', 'Could not extract TeraBox stream. Link may be expired or private.');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    res.send(stream.m3u8Content);
  }));

  // GET /api/history?ids=a,b,c - Availability of the caller's own sessions.
  // History itself lives in the browser; the server only says what is still downloadable.
  app.get('/api/history', (req, res) => {
    const ids = (typeof req.query.ids === 'string' ? req.query.ids : '')
      .split(',')
      .map(s => s.trim())
      .filter(id => SESSION_ID_PATTERN.test(id))
      .slice(0, 100);

    const records = ids.map(id => {
      const session = downloadManager.getSession(id);
      return session
        ? { sessionId: id, status: session.status, fileAvailable: session.fileAvailable, expiresAt: session.expiresAt ?? null }
        : { sessionId: id, status: 'EXPIRED', fileAvailable: false, expiresAt: null };
    });
    res.json({ success: true, records });
  });

  app.use('/api', (_req, res) => apiError(res, 404, 'NOT_FOUND', 'Endpoint not found'));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    if (err?.type === 'entity.parse.failed') return apiError(res, 400, 'INVALID_REQUEST', 'Malformed JSON body');
    if (err?.type === 'entity.too.large') return apiError(res, 413, 'INVALID_REQUEST', 'Request body too large');
    if (err?.status === 404 || err?.code === 'ENOENT') return apiError(res, 404, 'NOT_FOUND', 'Not found');
    if (err?.status === 416) return apiError(res, 416, 'RANGE_NOT_SATISFIABLE', 'Requested range not satisfiable');
    console.error('Unhandled error:', err);
    apiError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  });

  return app;
}
