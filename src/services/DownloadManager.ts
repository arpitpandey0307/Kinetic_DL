import { ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AudioFormat,
  DownloadProgress,
  DownloadRequest,
  DownloadSession,
  DownloadStatus,
  ErrorCode,
  ExtractorError,
  MediaFormat,
  TERMINAL_STATUSES
} from '../types';
import { AdapterRegistry } from '../adapters';
import { ProgressTracker } from './ProgressTracker';
import { TeraBoxExtractor } from './TeraBoxExtractor';
import { YtDlp, killTree } from './YtDlp';
import { ClassifiedError, classifyError } from '../utils/errors';

export const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROGRESS_PREFIX = 'KDL_PROGRESS|';
const FILE_PREFIX = 'KDL_FILE|';
const TEMP_FILE = /\.(part|ytdl|temp|tmp)$|\.part-Frag\d+$|\.f\d+\.\w+$/i;

export class QueueFullError extends Error {
  constructor() {
    super('Server is busy: download queue is full. Try again shortly.');
    this.name = 'QueueFullError';
  }
}

interface SessionState {
  sessionId: string;
  url: string;
  formatId: string;
  audioOnly: boolean;
  audioFormat: AudioFormat;
  status: DownloadStatus;
  createdAt: number;
  startTime?: number;
  endTime?: number;
  error?: ExtractorError;
  sessionDir: string;
  outputFilePath?: string;
  process?: ChildProcess;
  abort?: AbortController;
  cancelRequested: boolean;
}

export interface DownloadManagerOptions {
  adapterRegistry: AdapterRegistry;
  progressTracker: ProgressTracker;
  teraBoxExtractor: TeraBoxExtractor;
  ytdlp: YtDlp;
  downloadDir: string;
  maxConcurrent?: number;
  maxQueueLength?: number;
  maxFileSize?: number;
  fileTtlMs?: number;
  downloadTimeoutMs?: number;
  /** Looks up a format from a recent analysis to know if it carries audio */
  formatLookup?: (url: string, formatId: string) => MediaFormat | undefined;
}

export interface ParsedLine {
  type: 'progress' | 'file';
  downloaded?: number;
  total?: number;
  speed?: number;
  eta?: number;
  status?: string;
  path?: string;
}

function num(value: string | undefined): number | undefined {
  if (value === undefined || value === 'NA' || value === 'None' || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse one line of yt-dlp output produced by our --progress-template / --print */
export function parseYtDlpLine(line: string): ParsedLine | null {
  const progressIdx = line.indexOf(PROGRESS_PREFIX);
  if (progressIdx !== -1) {
    const [downloaded, total, estimate, speed, eta, status] = line
      .slice(progressIdx + PROGRESS_PREFIX.length)
      .trim()
      .split('|');
    return {
      type: 'progress',
      downloaded: num(downloaded),
      total: num(total) ?? num(estimate),
      speed: num(speed),
      eta: num(eta),
      status
    };
  }
  const fileIdx = line.indexOf(FILE_PREFIX);
  if (fileIdx !== -1) {
    return { type: 'file', path: line.slice(fileIdx + FILE_PREFIX.length).trim() };
  }
  return null;
}

/**
 * yt-dlp downloads video and audio as separate parts before merging. This
 * folds per-part progress into one overall, monotonic percentage.
 */
export class PartAggregator {
  private partIndex = 0;
  private completedBytes = 0;
  private lastDownloaded = 0;
  private lastTotal = 0;

  constructor(private expectedParts: number) {}

  update(downloaded: number, total: number | undefined): { percent: number; downloadedBytes: number; totalBytes: number; partDone: boolean } {
    // A drop in downloaded bytes means yt-dlp moved on to the next part
    if (downloaded < this.lastDownloaded && this.lastDownloaded > 0) {
      this.completedBytes += this.lastTotal || this.lastDownloaded;
      this.partIndex++;
      if (this.partIndex >= this.expectedParts) this.expectedParts = this.partIndex + 1;
    }
    this.lastDownloaded = downloaded;
    if (total && total > 0) this.lastTotal = total;

    const partTotal = this.lastTotal || 0;
    const fraction = partTotal > 0 ? Math.min(1, downloaded / partTotal) : 0;
    const percent = ((this.partIndex + fraction) / this.expectedParts) * 100;
    return {
      percent: Math.min(99, percent),
      downloadedBytes: this.completedBytes + downloaded,
      totalBytes: this.completedBytes + partTotal,
      partDone: fraction >= 1 && this.partIndex >= this.expectedParts - 1
    };
  }
}

export class DownloadManager {
  private sessions = new Map<string, SessionState>();
  private queue: string[] = [];
  private active = new Set<string>();
  private readonly maxConcurrent: number;
  private readonly maxQueueLength: number;
  private readonly maxFileSize: number;
  private readonly fileTtlMs: number;
  private readonly downloadTimeoutMs: number;
  private readonly maxSessions = 1000;

  constructor(private opts: DownloadManagerOptions) {
    this.maxConcurrent = Math.max(1, opts.maxConcurrent ?? 3);
    this.maxQueueLength = Math.max(0, opts.maxQueueLength ?? 20);
    this.maxFileSize = opts.maxFileSize ?? 0;
    this.fileTtlMs = opts.fileTtlMs ?? 60 * 60 * 1000;
    this.downloadTimeoutMs = opts.downloadTimeoutMs ?? 30 * 60 * 1000;
    fs.mkdirSync(opts.downloadDir, { recursive: true });
  }

  /** Remove session folders left behind by a previous run (they can't be served) */
  purgeOrphans(): number {
    let removed = 0;
    for (const entry of fs.readdirSync(this.opts.downloadDir)) {
      if (SESSION_ID_PATTERN.test(entry) && !this.sessions.has(entry)) {
        fs.rmSync(path.join(this.opts.downloadDir, entry), { recursive: true, force: true });
        removed++;
      }
    }
    return removed;
  }

  startDownload(request: DownloadRequest): DownloadSession {
    if (this.queue.length >= this.maxQueueLength && this.active.size >= this.maxConcurrent) {
      throw new QueueFullError();
    }

    const sessionId = randomUUID();
    const session: SessionState = {
      sessionId,
      url: request.url,
      formatId: request.formatId || 'best',
      audioOnly: !!request.audioOnly,
      audioFormat: request.audioFormat === 'flac' ? 'flac' : 'mp3',
      status: DownloadStatus.QUEUED,
      createdAt: Date.now(),
      sessionDir: path.join(this.opts.downloadDir, sessionId),
      cancelRequested: false
    };

    this.sessions.set(sessionId, session);
    this.opts.progressTracker.init(sessionId, DownloadStatus.QUEUED);
    this.queue.push(sessionId);
    this.pump();
    this.enforceSessionLimit();

    return this.toPublic(session);
  }

  /** Start queued downloads while there are free slots */
  private pump(): void {
    while (this.active.size < this.maxConcurrent && this.queue.length > 0) {
      const sessionId = this.queue.shift()!;
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== DownloadStatus.QUEUED) continue;

      this.active.add(sessionId);
      this.execute(session)
        .catch(err => this.finish(session, DownloadStatus.FAILED, classifyError(err)))
        .finally(() => {
          this.active.delete(sessionId);
          this.pump();
        });
    }
  }

  async cancelDownload(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || TERMINAL_STATUSES.has(session.status)) return false;

    session.cancelRequested = true;
    if (session.status === DownloadStatus.QUEUED) {
      this.queue = this.queue.filter(id => id !== sessionId);
      this.finish(session, DownloadStatus.CANCELLED);
      return true;
    }
    if (session.process) killTree(session.process);
    session.abort?.abort();
    return true;
  }

  getSession(sessionId: string): DownloadSession | undefined {
    const session = this.sessions.get(sessionId);
    return session ? this.toPublic(session) : undefined;
  }

  /** Absolute path of a finished download, only if it is still on disk */
  getFilePath(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== DownloadStatus.COMPLETED || !session.outputFilePath) return null;
    return fs.existsSync(session.outputFilePath) ? session.outputFilePath : null;
  }

  getStats() {
    return { active: this.active.size, queued: this.queue.length, sessions: this.sessions.size };
  }

  private toPublic(s: SessionState): DownloadSession {
    const progress = this.opts.progressTracker.getProgress(s.sessionId) || {
      sessionId: s.sessionId, status: s.status, percent: 0, downloadedBytes: 0, totalBytes: 0, speed: 0, eta: 0, filename: ''
    };
    return {
      sessionId: s.sessionId,
      status: s.status,
      url: s.url,
      formatId: s.formatId,
      audioOnly: s.audioOnly,
      audioFormat: s.audioFormat,
      progress,
      createdAt: s.createdAt,
      startTime: s.startTime,
      endTime: s.endTime,
      error: s.error,
      fileAvailable: s.status === DownloadStatus.COMPLETED && !!s.outputFilePath && fs.existsSync(s.outputFilePath),
      expiresAt: s.endTime && s.status === DownloadStatus.COMPLETED ? s.endTime + this.fileTtlMs : undefined
    };
  }

  private setStatus(session: SessionState, status: DownloadStatus): void {
    session.status = status;
    this.opts.progressTracker.updateProgress(session.sessionId, { status });
  }

  private finish(session: SessionState, status: DownloadStatus, error?: ExtractorError): void {
    if (TERMINAL_STATUSES.has(session.status)) return;
    session.status = status;
    session.endTime = Date.now();
    session.error = error;
    session.process = undefined;
    session.abort = undefined;

    if (status !== DownloadStatus.COMPLETED) {
      fs.rmSync(session.sessionDir, { recursive: true, force: true });
      session.outputFilePath = undefined;
    }

    const finalUpdate: Partial<DownloadProgress> = {
      status,
      error,
      filename: session.outputFilePath ? path.basename(session.outputFilePath) : ''
    };
    if (session.outputFilePath) {
      // Report the real size after merging / audio conversion
      const size = fs.statSync(session.outputFilePath).size;
      finalUpdate.totalBytes = size;
      finalUpdate.downloadedBytes = size;
    }
    this.opts.progressTracker.updateProgress(session.sessionId, finalUpdate);

    const label = status === DownloadStatus.COMPLETED ? 'completed' : `${status.toLowerCase()}${error ? `: ${error.message}` : ''}`;
    console.log(`[Download ${session.sessionId}] ${label}`);
  }

  private async execute(session: SessionState): Promise<void> {
    session.startTime = Date.now();
    fs.mkdirSync(session.sessionDir, { recursive: true });
    this.setStatus(session, DownloadStatus.DOWNLOADING);

    if (TeraBoxExtractor.isTeraBoxUrl(session.url)) {
      await this.executeTeraBox(session);
    } else {
      await this.executeYtDlp(session);
    }
  }

  private executeYtDlp(session: SessionState): Promise<void> {
    const adapter = this.opts.adapterRegistry.getAdapterForUrl(session.url);
    if (!adapter) {
      this.finish(session, DownloadStatus.FAILED, { code: ErrorCode.INVALID_URL, message: 'Unsupported platform', retryable: false });
      return Promise.resolve();
    }

    const format = this.opts.formatLookup?.(session.url, session.formatId);
    const formatHasAudio = !!format && !!format.acodec && format.acodec !== 'none';
    const args = adapter.getYtDlpArgs(session.url, {
      audioOnly: session.audioOnly,
      audioFormat: session.audioFormat,
      formatId: session.formatId,
      formatHasAudio
    });

    // Options must precede the trailing "-- <url>" that adapters emit
    const urlSeparator = args.lastIndexOf('--');
    const extra = [
      '-o', path.join(session.sessionDir, '%(title).150B.%(ext)s'),
      '--windows-filenames',
      '--newline', '--progress', '--no-warnings',
      '--progress-template',
      `download:${PROGRESS_PREFIX}%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s|%(progress.status)s`,
      '--print', `after_move:${FILE_PREFIX}%(filepath)s`,
      '--retries', '5', '--fragment-retries', '5',
      '--concurrent-fragments', '4'
    ];
    if (this.maxFileSize > 0) extra.push('--max-filesize', String(this.maxFileSize));
    args.splice(urlSeparator, 0, ...extra);

    // Video-only formats are downloaded as two parts (video + audio) then merged
    const aggregator = new PartAggregator(session.audioOnly || formatHasAudio ? 1 : 2);

    return new Promise<void>(resolve => {
      let child: ChildProcess;
      try {
        child = this.opts.ytdlp.spawn(args);
      } catch (e) {
        this.finish(session, DownloadStatus.FAILED, classifyError(e));
        resolve();
        return;
      }
      session.process = child;

      let stderrTail = '';
      let settled = false;
      const done = (status: DownloadStatus, error?: ExtractorError) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.finish(session, status, error);
        resolve();
      };

      const timer = setTimeout(() => {
        killTree(child, 'SIGKILL');
        done(DownloadStatus.FAILED, {
          code: ErrorCode.NETWORK_ERROR,
          message: `Download exceeded the ${Math.round(this.downloadTimeoutMs / 60000)} minute limit`,
          retryable: true
        });
      }, this.downloadTimeoutMs);

      const onLine = (line: string) => {
        const parsed = parseYtDlpLine(line);
        if (!parsed) return;
        if (parsed.type === 'file' && parsed.path) {
          const resolved = path.resolve(parsed.path);
          if (resolved.startsWith(session.sessionDir + path.sep)) session.outputFilePath = resolved;
          return;
        }
        if (parsed.downloaded === undefined) return;
        const agg = aggregator.update(parsed.downloaded, parsed.total);
        this.opts.progressTracker.updateProgress(session.sessionId, {
          percent: agg.percent,
          downloadedBytes: agg.downloadedBytes,
          totalBytes: agg.totalBytes,
          speed: parsed.speed || 0,
          eta: Math.round(parsed.eta || 0)
        });
        if (agg.partDone && parsed.status === 'finished' && session.status === DownloadStatus.DOWNLOADING) {
          this.setStatus(session, DownloadStatus.PROCESSING);
        }
      };

      const lineReader = (stream: NodeJS.ReadableStream | null, keepTail: boolean) => {
        let buffer = '';
        stream?.on('data', chunk => {
          const text = chunk.toString();
          if (keepTail) stderrTail = (stderrTail + text).slice(-8000);
          buffer += text;
          const lines = buffer.split(/\r?\n|\r/);
          buffer = lines.pop() || '';
          lines.forEach(onLine);
        });
        stream?.on('end', () => {
          if (buffer) onLine(buffer);
        });
      };
      lineReader(child.stdout, true);
      lineReader(child.stderr, true);

      child.on('error', err => done(DownloadStatus.FAILED, classifyError(err)));
      child.on('close', code => {
        if (session.cancelRequested) {
          done(DownloadStatus.CANCELLED, { code: ErrorCode.CANCELLED, message: 'Download cancelled', retryable: true });
          return;
        }
        if (code !== 0) {
          done(DownloadStatus.FAILED, classifyError(new Error(`yt-dlp exited with code ${code}`), stderrTail));
          return;
        }
        if (!session.outputFilePath || !fs.existsSync(session.outputFilePath)) {
          session.outputFilePath = this.findOutputFile(session.sessionDir) || undefined;
        }
        if (!session.outputFilePath) {
          const error = /max-filesize/i.test(stderrTail)
            ? classifyError(new Error('File is larger than max-filesize'))
            : { code: ErrorCode.UNKNOWN_ERROR, message: 'yt-dlp finished but produced no file', retryable: true, details: stderrTail.slice(-300) };
          done(DownloadStatus.FAILED, error);
          return;
        }
        done(DownloadStatus.COMPLETED);
      });
    });
  }

  /** Largest finished (non-temporary) file in the session folder */
  private findOutputFile(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const candidates = fs.readdirSync(dir)
      .filter(f => !TEMP_FILE.test(f) && !f.endsWith('.m3u8'))
      .map(f => path.join(dir, f))
      .filter(f => fs.statSync(f).isFile())
      .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
    return candidates[0] || null;
  }

  private async executeTeraBox(session: SessionState): Promise<void> {
    const tb = this.opts.teraBoxExtractor;
    session.abort = new AbortController();
    const signal = session.abort.signal;

    try {
      const tbResult = await tb.extract(session.url);
      if (!tbResult.success || tbResult.files.length === 0) {
        throw new ClassifiedError({ code: ErrorCode.VIDEO_NOT_FOUND, message: tbResult.error || 'Failed to extract TeraBox file', retryable: true });
      }

      let fileIndex = 0;
      const match = /^terabox-(\d+)$/.exec(session.formatId);
      if (match) fileIndex = Number(match[1]);
      if (fileIndex >= tbResult.files.length) fileIndex = 0;
      const file = tbResult.files[fileIndex];

      const safeName = TeraBoxExtractor.safeFilename(file.filename);
      const outputFilePath = path.join(session.sessionDir, safeName);
      if (this.maxFileSize > 0 && file.size > this.maxFileSize) {
        throw new ClassifiedError(classifyError(new Error('File is larger than max-filesize')));
      }

      this.opts.progressTracker.updateProgress(session.sessionId, { totalBytes: file.size, filename: safeName });

      let lastTime = Date.now();
      let lastBytes = 0;
      const onProgress = (downloaded: number, total: number) => {
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed < 0.25) return;
        const speed = (downloaded - lastBytes) / elapsed;
        lastTime = now;
        lastBytes = downloaded;
        const totalBytes = total || file.size;
        this.opts.progressTracker.updateProgress(session.sessionId, {
          downloadedBytes: downloaded,
          totalBytes,
          percent: totalBytes > 0 ? Math.min(99, (downloaded / totalBytes) * 100) : 0,
          speed,
          eta: speed > 0 && totalBytes > downloaded ? Math.round((totalBytes - downloaded) / speed) : 0
        });
      };

      if (file.dlink) {
        await tb.downloadFile(file.dlink, outputFilePath, session.url, onProgress, signal, this.maxFileSize);
      } else {
        // No direct link without a logged-in account: remux the HLS stream instead
        await tb.downloadViaStream(session.url, outputFilePath.replace(/\.[^.]+$/, '') + '.mp4', session.sessionDir, onProgress, signal);
      }

      session.outputFilePath = this.findOutputFile(session.sessionDir) || undefined;
      if (!session.outputFilePath) throw new Error('TeraBox download produced no file');
      this.finish(session, DownloadStatus.COMPLETED);
    } catch (error) {
      if (session.cancelRequested) {
        this.finish(session, DownloadStatus.CANCELLED, { code: ErrorCode.CANCELLED, message: 'Download cancelled', retryable: true });
      } else {
        this.finish(session, DownloadStatus.FAILED, classifyError(error));
      }
    }
  }

  /** Delete expired sessions and their files */
  cleanupSessions(now = Date.now()): number {
    let removed = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.endTime && now - session.endTime > this.fileTtlMs) {
        this.removeSession(sessionId, session);
        removed++;
      }
    }
    return removed;
  }

  private enforceSessionLimit(): void {
    if (this.sessions.size <= this.maxSessions) return;
    const finished = Array.from(this.sessions.values())
      .filter(s => TERMINAL_STATUSES.has(s.status))
      .sort((a, b) => (a.endTime || 0) - (b.endTime || 0));
    for (const s of finished) {
      if (this.sessions.size <= this.maxSessions) break;
      this.removeSession(s.sessionId, s);
    }
  }

  private removeSession(sessionId: string, session: SessionState): void {
    fs.rmSync(session.sessionDir, { recursive: true, force: true });
    this.opts.progressTracker.cleanup(sessionId);
    this.sessions.delete(sessionId);
  }

  /** Kill everything (graceful shutdown) */
  shutdown(): void {
    for (const session of this.sessions.values()) {
      if (session.process) killTree(session.process, 'SIGKILL');
      session.abort?.abort();
    }
  }
}
