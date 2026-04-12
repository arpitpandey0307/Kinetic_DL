import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { spawn } from 'child_process';
import { createAdapterRegistry } from './adapters';
import { MediaExtractor } from './services/MediaExtractor';
import { DownloadManager } from './services/DownloadManager';
import { ProgressTracker } from './services/ProgressTracker';
import { TeraBoxExtractor } from './services/TeraBoxExtractor';
import { URLParser } from './utils/URLParser';
import { DownloadStatus } from './types';

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = path.resolve('./downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  console.log(`Created downloads directory: ${DOWNLOAD_DIR}`);
}

// Initialize services
const adapterRegistry = createAdapterRegistry();
const urlParser = new URLParser();
const mediaExtractor = new MediaExtractor(adapterRegistry);
const teraBoxExtractor = new TeraBoxExtractor();
const progressTracker = new ProgressTracker();
const downloadManager = new DownloadManager(adapterRegistry, progressTracker, teraBoxExtractor, 'yt-dlp', DOWNLOAD_DIR);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// POST /api/analyze - Analyze URL and return available formats
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'URL is required'
        }
      });
    }

    // Validate URL
    const parseResult = urlParser.parse(url);
    if (!parseResult.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: parseResult.error || 'Invalid URL'
        }
      });
    }

    // Handle TeraBox directly
    if (TeraBoxExtractor.isTeraBoxUrl(url)) {
      console.log(`Analyzing TeraBox URL: ${url}`);
      const tbResult = await teraBoxExtractor.extract(url);
      
      if (!tbResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_URL', message: tbResult.error, retryable: false }
        });
      }

      // Convert to standard result format
      const formats = tbResult.files.map((f, i) => ({
        formatId: `terabox-${i}`,
        resolution: 'unknown',
        codec: 'unknown',
        container: 'mp4',
        filesize: f.size
      }));

      const qualities = tbResult.files.map((f, i) => ({
        label: `TeraBox File ${i + 1} (${(f.size / 1024 / 1024).toFixed(1)}MB)`,
        resolution: 'unknown',
        formatId: `terabox-${i}`,
        codec: 'unknown',
        container: 'mp4',
        filesize: f.size
      }));

      return res.json({
        success: true,
        data: {
          success: true,
          metadata: {
            title: tbResult.title || tbResult.files[0].filename,
            thumbnail: tbResult.thumbnail || '',
            duration: 0,
            formats
          },
          availableQualities: qualities,
          teraBoxData: tbResult.files // Secret store for DownloadManager
        }
      });
    }

    console.log(`Analyzing URL: ${url} (platform: ${parseResult.platform})`);

    // Analyze URL using yt-dlp
    const result = await mediaExtractor.analyze(url);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze URL'
      }
    });
  }
});

// POST /api/download - Initiate download
app.post('/api/download', async (req: Request, res: Response) => {
  try {
    const { url, formatId, audioOnly } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'URL is required'
        }
      });
    }

    if (!formatId && !audioOnly) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Format selection is required'
        }
      });
    }

    const session = await downloadManager.startDownload({
      url,
      formatId: formatId || 'best',
      audioOnly: audioOnly || false
    });

    res.json({
      success: true,
      sessionId: session.sessionId
    });

  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to start download'
      }
    });
  }
});

// GET /api/progress/:sessionId - SSE endpoint for progress updates
app.get('/api/progress/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection message
  res.write('data: {"type":"connected"}\n\n');

  // Subscribe to progress updates
  const unsubscribe = progressTracker.subscribe(sessionId, (progress) => {
    const data = JSON.stringify({
      type: 'progress',
      data: progress
    });
    res.write(`data: ${data}\n\n`);

    // Close connection on completion or failure
    if (progress.status === DownloadStatus.COMPLETED || 
        progress.status === DownloadStatus.FAILED ||
        progress.status === DownloadStatus.CANCELLED) {
      res.write(`data: ${JSON.stringify({ type: 'complete', data: progress })}\n\n`);
      setTimeout(() => res.end(), 500);
    }
  });

  // Handle client disconnect
  req.on('close', () => {
    unsubscribe();
  });
});

// POST /api/cancel/:sessionId - Cancel a download
app.post('/api/cancel/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    await downloadManager.cancelDownload(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Cancel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel download'
      }
    });
  }
});

// GET /api/download/:sessionId/file - Serve completed download file
app.get('/api/download/:sessionId/file', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = downloadManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' }
      });
    }

    if (session.status !== DownloadStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_READY', message: 'Download not completed yet' }
      });
    }

    // Find the downloaded file - look for files starting with sessionId in downloads dir
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const sessionFile = files.find(f => f.startsWith(sessionId));

    if (!sessionFile) {
      // Fallback: try using the outputFilePath from progress
      if (session.outputFilePath && fs.existsSync(session.outputFilePath)) {
        const filename = path.basename(session.outputFilePath);
        return res.download(session.outputFilePath, filename);
      }

      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Downloaded file not found on disk' }
      });
    }

    const filePath = path.join(DOWNLOAD_DIR, sessionFile);
    // Remove the sessionId prefix for a cleaner download filename
    const cleanName = sessionFile.replace(`${sessionId}_`, '');
    res.download(filePath, cleanName);

  } catch (error: any) {
    console.error('File serve error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to serve file' }
    });
  }
});

// GET /api/stream?url= - Get direct stream URL for in-app playback (no download)
app.get('/api/stream', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'URL is required' } });
    }

    if (TeraBoxExtractor.isTeraBoxUrl(url)) {
      // TeraBox: return the M3U8 proxy URL for HLS playback
      const proxyStreamUrl = `/api/terabox-stream?url=${encodeURIComponent(url)}`;
      return res.json({ 
        success: true, 
        streamUrl: proxyStreamUrl,
        isHLS: true  // Tell frontend to use HLS.js
      });
    }

    // Use yt-dlp -g to get the direct stream URL
    const ytdlp = spawn('yt-dlp', [
      '-g',                          // Print direct URL only
      '-f', 'best[ext=mp4]/best',   // Prefer mp4 for browser compatibility
      '--no-warnings',
      '--no-playlist',
      url
    ]);

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      ytdlp.kill();
      res.status(504).json({ success: false, error: { code: 'TIMEOUT', message: 'Stream URL fetch timed out' } });
    }, 30000);

    ytdlp.stdout.on('data', (data) => { stdout += data.toString(); });
    ytdlp.stderr.on('data', (data) => { stderr += data.toString(); });

    ytdlp.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        console.error('Stream URL fetch failed:', stderr);
        return res.status(500).json({ success: false, error: { code: 'STREAM_ERROR', message: 'Could not get stream URL' } });
      }
      const urls = stdout.trim().split('\n').filter(u => u.startsWith('http'));
      if (urls.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NO_STREAM', message: 'No streamable URL found' } });
      }
      // Return the first (best) URL
      res.json({ success: true, streamUrl: urls[0] });
    });

    ytdlp.on('error', (error) => {
      clearTimeout(timeout);
      console.error('yt-dlp spawn error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to start yt-dlp' } });
    });

  } catch (error: any) {
    console.error('Stream error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Stream failed' } });
  }
});

// GET /api/terabox-stream?url= - Serve M3U8 playlist for TeraBox video (HLS streaming)
app.get('/api/terabox-stream', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url || !TeraBoxExtractor.isTeraBoxUrl(url)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Valid TeraBox URL required' } });
    }

    console.log('[TeraBox Stream] Getting M3U8 for:', url);
    const m3u8Info = await teraBoxExtractor.getM3U8StreamUrl(url);
    
    if (!m3u8Info) {
      return res.status(404).json({ success: false, error: { code: 'NO_STREAM', message: 'Could not extract TeraBox stream. Link may be expired or private.' } });
    }

    console.log('[TeraBox Stream] Serving M3U8 playlist');
    
    // Serve the M3U8 content directly — the .ts segment URLs inside are
    // direct CDN links (v4.freeterabox.com) that don't need cookies/auth
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(m3u8Info.m3u8Content);

  } catch (error: any) {
    console.error('[TeraBox Stream] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'TeraBox stream failed' } });
    }
  }
});

// GET /api/stream/:sessionId/file - Stream a downloaded file for in-app playback (with Range support)
app.get('/api/stream/:sessionId/file', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Find the file in downloads directory
    const files = fs.readdirSync(DOWNLOAD_DIR);
    let filePath = '';
    const sessionFile = files.find(f => f.startsWith(sessionId));
    
    if (sessionFile) {
      filePath = path.join(DOWNLOAD_DIR, sessionFile);
    } else {
      // Fallback: check session's stored path
      const session = downloadManager.getSession(sessionId);
      if (session?.outputFilePath && fs.existsSync(session.outputFilePath)) {
        filePath = session.outputFilePath;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'File not found' } });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Support HTTP Range requests for video seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(filePath).pipe(res);
    }

  } catch (error: any) {
    console.error('Stream file error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Stream failed' } });
  }
});

// GET /api/history - Get download history
app.get('/api/history', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      records: []
    });
  } catch (error: any) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch history'
      }
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// Cleanup old sessions periodically
setInterval(() => {
  downloadManager.cleanupSessions();
}, 60 * 60 * 1000); // Every hour

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Downloads directory: ${DOWNLOAD_DIR}`);
  console.log(`Supported platforms: ${adapterRegistry.getAllAdapters().map(a => a.name).join(', ')}`);
});

export default app;
