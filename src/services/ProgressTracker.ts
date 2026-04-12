import { ChildProcess } from 'child_process';
import { DownloadProgress, DownloadStatus } from '../types';

type ProgressCallback = (progress: DownloadProgress) => void;
type Unsubscribe = () => void;

export class ProgressTracker {
  private progressState: Map<string, DownloadProgress> = new Map();
  private subscribers: Map<string, Set<ProgressCallback>> = new Map();
  private lastUpdate: Map<string, number> = new Map();
  private updateThrottle = 500; // ms

  trackSession(sessionId: string, process: ChildProcess): void {
    const progress: DownloadProgress = {
      sessionId,
      status: DownloadStatus.DOWNLOADING,
      percent: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      eta: 0,
      filename: ''
    };

    this.progressState.set(sessionId, progress);

    process.stdout?.on('data', (data) => {
      this.parseProgressOutput(sessionId, data.toString());
    });

    process.on('close', (code) => {
      const currentProgress = this.progressState.get(sessionId);
      if (currentProgress) {
        currentProgress.status = code === 0 ? DownloadStatus.COMPLETED : DownloadStatus.FAILED;
        currentProgress.percent = code === 0 ? 100 : currentProgress.percent;
        this.notifySubscribers(sessionId, currentProgress);
      }
    });
  }

  getProgress(sessionId: string): DownloadProgress | null {
    return this.progressState.get(sessionId) || null;
  }

  subscribe(sessionId: string, callback: ProgressCallback): Unsubscribe {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }

    this.subscribers.get(sessionId)!.add(callback);

    // Send current progress immediately
    const currentProgress = this.progressState.get(sessionId);
    if (currentProgress) {
      callback(currentProgress);
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(sessionId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(sessionId);
        }
      }
    };
  }

  updateProgress(sessionId: string, updates: Partial<DownloadProgress>): void {
    const progress = this.progressState.get(sessionId);
    if (!progress) return;

    // Ensure monotonicity for percent
    if (updates.percent !== undefined && updates.percent < progress.percent) {
      updates.percent = progress.percent;
    }

    Object.assign(progress, updates);
    this.notifySubscribers(sessionId, progress);
  }

  private parseProgressOutput(sessionId: string, output: string): void {
    const progress = this.progressState.get(sessionId);
    if (!progress) return;

    // Throttle updates
    const lastUpdate = this.lastUpdate.get(sessionId) || 0;
    const now = Date.now();
    if (now - lastUpdate < this.updateThrottle) {
      return;
    }
    this.lastUpdate.set(sessionId, now);

    // Parse yt-dlp progress output
    const percentMatch = output.match(/(\d+\.?\d*)%/);
    const sizeMatch = output.match(/of\s+([\d.]+)([KMG]iB)/);
    const speedMatch = output.match(/at\s+([\d.]+)([KMG]iB)\/s/);
    const etaMatch = output.match(/ETA\s+(\d+):(\d+)/);
    const filenameMatch = output.match(/Destination:\s+(.+)/);

    let updated = false;

    if (percentMatch) {
      const newPercent = parseFloat(percentMatch[1]);
      // Ensure monotonicity
      if (newPercent >= progress.percent) {
        progress.percent = newPercent;
        updated = true;
      }
    }

    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2];
      progress.totalBytes = this.convertToBytes(size, unit);
      progress.downloadedBytes = (progress.totalBytes * progress.percent) / 100;
      updated = true;
    }

    if (speedMatch) {
      const speed = parseFloat(speedMatch[1]);
      const unit = speedMatch[2];
      progress.speed = this.convertToBytes(speed, unit);
      updated = true;
    }

    if (etaMatch) {
      const minutes = parseInt(etaMatch[1]);
      const seconds = parseInt(etaMatch[2]);
      progress.eta = minutes * 60 + seconds;
      updated = true;
    }

    if (filenameMatch) {
      progress.filename = filenameMatch[1].trim();
      updated = true;
    }

    if (updated) {
      this.notifySubscribers(sessionId, progress);
    }
  }

  private notifySubscribers(sessionId: string, progress: DownloadProgress): void {
    const subs = this.subscribers.get(sessionId);
    if (subs) {
      subs.forEach(callback => callback({ ...progress }));
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

  cleanup(sessionId: string): void {
    this.progressState.delete(sessionId);
    this.subscribers.delete(sessionId);
    this.lastUpdate.delete(sessionId);
  }
}
