import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  DownloadRequest,
  DownloadSession,
  DownloadProgress,
  DownloadStatus,
  ExtractorError,
  ErrorCode
} from '../types';
import { AdapterRegistry } from '../adapters';
import { ProgressTracker } from './ProgressTracker';
import { TeraBoxExtractor } from './TeraBoxExtractor';

interface SessionState {
  sessionId: string;
  url: string;
  formatId: string;
  audioOnly: boolean;
  status: DownloadStatus;
  progress: DownloadProgress;
  startTime: number;
  endTime?: number;
  error?: ExtractorError;
  process?: ChildProcess;
  outputFilePath?: string;
}

export class DownloadManager {
  private sessions: Map<string, SessionState> = new Map();
  private queue: DownloadRequest[] = [];
  private maxConcurrent = 3;

  constructor(
    private adapterRegistry: AdapterRegistry,
    private progressTracker: ProgressTracker,
    private teraBoxExtractor: TeraBoxExtractor,
    private ytdlpPath: string = 'yt-dlp',
    private downloadDir: string = './downloads'
  ) {}

  async startDownload(request: DownloadRequest): Promise<DownloadSession> {
    const sessionId = uuidv4();
    
    const session: SessionState = {
      sessionId,
      url: request.url,
      formatId: request.formatId,
      audioOnly: request.audioOnly,
      status: DownloadStatus.QUEUED,
      progress: {
        sessionId,
        status: DownloadStatus.QUEUED,
        percent: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        eta: 0,
        filename: ''
      },
      startTime: Date.now()
    };

    this.sessions.set(sessionId, session);

    // Check if we can start immediately
    const activeDownloads = Array.from(this.sessions.values()).filter(
      s => s.status === DownloadStatus.DOWNLOADING
    );

    if (activeDownloads.length < this.maxConcurrent) {
      this.executeDownload(sessionId);
    } else {
      this.queue.push(request);
    }

    return {
      sessionId,
      status: session.status,
      url: request.url,
      formatId: request.formatId,
      audioOnly: request.audioOnly,
      progress: session.progress,
      startTime: session.startTime
    };
  }

  async cancelDownload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.process) {
      session.process.kill();
    }

    session.status = DownloadStatus.CANCELLED;
    session.progress.status = DownloadStatus.CANCELLED;
    session.endTime = Date.now();

    // Notify progress tracker
    this.progressTracker.updateProgress(sessionId, {
      status: DownloadStatus.CANCELLED
    });

    // Start next queued download
    this.processQueue();
  }

  getProgress(sessionId: string): DownloadProgress | null {
    const session = this.sessions.get(sessionId);
    return session ? session.progress : null;
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  private async executeDownload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = DownloadStatus.DOWNLOADING;
    session.progress.status = DownloadStatus.DOWNLOADING;

    try {
      // Handle TeraBox directly
      if (TeraBoxExtractor.isTeraBoxUrl(session.url)) {
        await this.executeTeraBoxDownload(sessionId, session);
        return;
      }

      const adapter = this.adapterRegistry.getAdapterForUrl(session.url);
      if (!adapter) {
        throw new Error('Unsupported platform');
      }

      const options = {
        audioOnly: session.audioOnly,
        formatId: session.formatId,
        format: session.audioOnly ? 'mp3' : undefined
      };

      const args = adapter.getYtDlpArgs(session.url, options);
      
      // Add output template — use sessionId in filename to make it easy to find
      const outputTemplate = path.join(this.downloadDir, `${sessionId}_%(title)s.%(ext)s`);
      args.push('-o', outputTemplate);
      
      // Add progress reporting
      args.push('--newline');
      
      // Restrict filename length to avoid filesystem issues
      args.push('--windows-filenames');

      console.log(`[Download ${sessionId}] Starting yt-dlp with args:`, args.join(' '));

      const dlProcess = spawn(this.ytdlpPath, args);
      session.process = dlProcess;

      // Wire the process to the ProgressTracker so SSE subscribers get updates
      this.progressTracker.trackSession(sessionId, dlProcess);

      dlProcess.stdout.on('data', (data) => {
        const output = data.toString();
        this.parseProgress(sessionId, output);
      });

      dlProcess.stderr.on('data', (data) => {
        console.error(`[Download ${sessionId}] stderr: ${data.toString()}`);
      });

      dlProcess.on('close', (code) => {
        if (code === 0) {
          session.status = DownloadStatus.COMPLETED;
          session.progress.status = DownloadStatus.COMPLETED;
          session.progress.percent = 100;
          session.endTime = Date.now();

          // Try to find the output file
          this.findOutputFile(sessionId);

          console.log(`[Download ${sessionId}] Completed successfully`);
        } else if (session.status !== DownloadStatus.CANCELLED) {
          session.status = DownloadStatus.FAILED;
          session.progress.status = DownloadStatus.FAILED;
          session.error = {
            code: ErrorCode.UNKNOWN_ERROR,
            message: `Download failed with exit code ${code}`,
            retryable: true
          };
          session.endTime = Date.now();

          console.error(`[Download ${sessionId}] Failed with code ${code}`);
        }

        // Process next in queue
        this.processQueue();
      });

      dlProcess.on('error', (error) => {
        session.status = DownloadStatus.FAILED;
        session.progress.status = DownloadStatus.FAILED;
        session.error = {
          code: ErrorCode.UNKNOWN_ERROR,
          message: error.message,
          retryable: true
        };
        session.endTime = Date.now();

        console.error(`[Download ${sessionId}] Process error:`, error.message);
        this.processQueue();
      });

    } catch (error: any) {
      session.status = DownloadStatus.FAILED;
      session.progress.status = DownloadStatus.FAILED;
      session.error = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message,
        retryable: false
      };
      session.endTime = Date.now();

      this.progressTracker.updateProgress(sessionId, {
        status: DownloadStatus.FAILED
      });

      this.processQueue();
    }
  }

  private findOutputFile(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // The filename is captured from yt-dlp "Destination:" output during progress parsing
    // If we have it, store the full path
    if (session.progress.filename) {
      session.outputFilePath = session.progress.filename;
    }
  }

  private async executeTeraBoxDownload(sessionId: string, session: SessionState): Promise<void> {
    try {
      console.log(`[Download ${sessionId}] Extracting TeraBox link: ${session.url}`);
      const tbResult = await this.teraBoxExtractor.extract(session.url);
      
      if (!tbResult.success || tbResult.files.length === 0) {
        throw new Error(tbResult.error || 'Failed to extract TeraBox file');
      }

      // Find the selected file from formatId (e.g. terabox-0)
      let fileIndex = 0;
      if (session.formatId && session.formatId.startsWith('terabox-')) {
        fileIndex = parseInt(session.formatId.split('-')[1]) || 0;
      }
      if (fileIndex >= tbResult.files.length) fileIndex = 0;
      
      const file = tbResult.files[fileIndex];
      const safeFilename = file.filename.replace(/[^a-zA-Z0-9.\-_ ()\[\]]/g, '_');
      const outputFilePath = path.join(this.downloadDir, `${sessionId}_${safeFilename}`);
      
      session.progress.filename = outputFilePath;
      session.outputFilePath = outputFilePath;
      session.progress.totalBytes = file.size;

      console.log(`[Download ${sessionId}] Downloading TeraBox proxy file: ${outputFilePath}`);

      let lastReportTime = 0;
      let lastDownloadedBytes = 0;

      await this.teraBoxExtractor.downloadFile(file.dlink, outputFilePath, session.url, (downloaded, total) => {
        // Fast progress reporting (throttle to 4 times per second)
        const now = Date.now();
        if (now - lastReportTime > 250) {
          const deltaSec = (now - lastReportTime) / 1000;
          const bytesDiff = downloaded - lastDownloadedBytes;
          const speed = bytesDiff / deltaSec;
          
          session.progress.downloadedBytes = downloaded;
          if (total > 0) session.progress.totalBytes = total;
          if (session.progress.totalBytes > 0) {
            session.progress.percent = parseFloat(((downloaded / session.progress.totalBytes) * 100).toFixed(1));
            session.progress.eta = Math.max(0, Math.floor((session.progress.totalBytes - downloaded) / speed));
          }
          session.progress.speed = speed;

          lastReportTime = now;
          lastDownloadedBytes = downloaded;

          this.progressTracker.updateProgress(sessionId, session.progress);
        }
      });

      // Done
      session.status = DownloadStatus.COMPLETED;
      session.progress.status = DownloadStatus.COMPLETED;
      session.progress.percent = 100;
      session.endTime = Date.now();
      
      this.progressTracker.updateProgress(sessionId, session.progress);
      console.log(`[Download ${sessionId}] TeraBox download completed successfully`);

    } catch (error: any) {
      session.status = DownloadStatus.FAILED;
      session.progress.status = DownloadStatus.FAILED;
      session.error = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message,
        retryable: true
      };
      session.endTime = Date.now();

      console.error(`[Download ${sessionId}] TeraBox download error:`, error.message);
      this.progressTracker.updateProgress(sessionId, { status: DownloadStatus.FAILED });
    } finally {
      this.processQueue();
    }
  }

  private parseProgress(sessionId: string, output: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Parse yt-dlp progress output
    // Format: [download]  45.2% of 123.45MiB at 1.23MiB/s ETA 00:45
    const percentMatch = output.match(/(\d+\.?\d*)%/);
    const sizeMatch = output.match(/of\s+([\d.]+)([KMG]iB)/);
    const speedMatch = output.match(/at\s+([\d.]+)([KMG]iB)\/s/);
    const etaMatch = output.match(/ETA\s+(\d+):(\d+)/);
    const filenameMatch = output.match(/Destination:\s+(.+)/);
    const mergeMatch = output.match(/Merging formats into "(.+)"/);

    if (percentMatch) {
      session.progress.percent = parseFloat(percentMatch[1]);
    }

    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2];
      session.progress.totalBytes = this.convertToBytes(size, unit);
      session.progress.downloadedBytes = (session.progress.totalBytes * session.progress.percent) / 100;
    }

    if (speedMatch) {
      const speed = parseFloat(speedMatch[1]);
      const unit = speedMatch[2];
      session.progress.speed = this.convertToBytes(speed, unit);
    }

    if (etaMatch) {
      const minutes = parseInt(etaMatch[1]);
      const seconds = parseInt(etaMatch[2]);
      session.progress.eta = minutes * 60 + seconds;
    }

    if (filenameMatch) {
      session.progress.filename = filenameMatch[1].trim();
      session.outputFilePath = filenameMatch[1].trim();
    }

    if (mergeMatch) {
      // When yt-dlp merges video+audio, the final file path is different
      session.outputFilePath = mergeMatch[1].trim();
      session.progress.filename = mergeMatch[1].trim();
    }
  }

  private convertToBytes(value: number, unit: string): number {
    const units: { [key: string]: number } = {
      'KiB': 1024,
      'MiB': 1024 * 1024,
      'GiB': 1024 * 1024 * 1024
    };
    return value * (units[unit] || 1);
  }

  private processQueue(): void {
    const activeDownloads = Array.from(this.sessions.values()).filter(
      s => s.status === DownloadStatus.DOWNLOADING
    );

    while (activeDownloads.length < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        this.startDownload(request);
      }
    }
  }

  sanitizeFilename(filename: string): string {
    let sanitized = filename.replace(/[<>:"|?*\/\\]/g, '_');
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');
    sanitized = sanitized.trim();
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }
    if (sanitized.length === 0) {
      sanitized = 'download';
    }
    return sanitized;
  }

  // Clean up old sessions (called periodically)
  cleanupSessions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.endTime && session.endTime < oneHourAgo) {
        this.progressTracker.cleanup(sessionId);
        this.sessions.delete(sessionId);
      }
    }
  }
}
