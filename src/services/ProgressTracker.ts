import { DownloadProgress, DownloadStatus, TERMINAL_STATUSES } from '../types';

type ProgressCallback = (progress: DownloadProgress) => void;
type Unsubscribe = () => void;

/**
 * Holds live progress for every session and fans updates out to subscribers
 * (the SSE endpoint). Every download path reports through updateProgress().
 */
export class ProgressTracker {
  private progressState = new Map<string, DownloadProgress>();
  private subscribers = new Map<string, Set<ProgressCallback>>();
  private lastNotify = new Map<string, number>();

  constructor(private throttleMs = 250) {}

  init(sessionId: string, status: DownloadStatus = DownloadStatus.QUEUED): DownloadProgress {
    const progress: DownloadProgress = {
      sessionId,
      status,
      percent: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      eta: 0,
      filename: ''
    };
    this.progressState.set(sessionId, progress);
    return progress;
  }

  getProgress(sessionId: string): DownloadProgress | null {
    const progress = this.progressState.get(sessionId);
    return progress ? { ...progress } : null;
  }

  subscribe(sessionId: string, callback: ProgressCallback): Unsubscribe {
    let subs = this.subscribers.get(sessionId);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(sessionId, subs);
    }
    subs.add(callback);

    // Send current state immediately so late subscribers are never left waiting
    const current = this.progressState.get(sessionId);
    if (current) callback({ ...current });

    return () => {
      const set = this.subscribers.get(sessionId);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) this.subscribers.delete(sessionId);
    };
  }

  /**
   * Merge an update. Percent never goes backwards while a download is active.
   * Status changes are always delivered; plain progress ticks are throttled.
   */
  updateProgress(sessionId: string, updates: Partial<DownloadProgress>): void {
    const progress = this.progressState.get(sessionId);
    if (!progress) return;
    if (TERMINAL_STATUSES.has(progress.status)) return; // final state is immutable

    const next = { ...updates };
    if (next.percent !== undefined) {
      next.percent = Math.min(100, Math.max(progress.percent, Number(next.percent.toFixed(1))));
    }
    const statusChanged = next.status !== undefined && next.status !== progress.status;
    Object.assign(progress, next);

    if (progress.status === DownloadStatus.COMPLETED) progress.percent = 100;
    if (TERMINAL_STATUSES.has(progress.status)) {
      progress.speed = 0;
      progress.eta = 0;
    }

    const now = Date.now();
    if (statusChanged || now - (this.lastNotify.get(sessionId) || 0) >= this.throttleMs) {
      this.lastNotify.set(sessionId, now);
      this.notifySubscribers(sessionId, progress);
    }
  }

  private notifySubscribers(sessionId: string, progress: DownloadProgress): void {
    const subs = this.subscribers.get(sessionId);
    if (!subs) return;
    for (const callback of Array.from(subs)) {
      try {
        callback({ ...progress });
      } catch (e) {
        console.error(`[ProgressTracker] subscriber error for ${sessionId}:`, e);
      }
    }
  }

  cleanup(sessionId: string): void {
    this.progressState.delete(sessionId);
    this.subscribers.delete(sessionId);
    this.lastNotify.delete(sessionId);
  }
}
