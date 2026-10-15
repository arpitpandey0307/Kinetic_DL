import { AnalysisResult, MediaFormat, MediaMetadata, QualityOption, ErrorCode } from '../types';
import { AdapterRegistry } from '../adapters';
import { YtDlp } from './YtDlp';
import { classifyError, withRetry } from '../utils/errors';

interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
}

const CODEC_PREFERENCE = ['avc1', 'h264', 'vp09', 'vp9', 'hev1', 'hvc1', 'av01'];

function codecRank(codec?: string): number {
  if (!codec) return CODEC_PREFERENCE.length;
  const idx = CODEC_PREFERENCE.findIndex(c => codec.toLowerCase().startsWith(c));
  return idx === -1 ? CODEC_PREFERENCE.length : idx;
}

function hasVideo(f: MediaFormat): boolean {
  if (f.vcodec && f.vcodec !== 'none') return true;
  // Some extractors omit vcodec but do report dimensions
  return !f.vcodec && !!f.height;
}

function hasAudio(f: MediaFormat): boolean {
  return !!f.acodec && f.acodec !== 'none';
}

/** Short side of the frame, so 1080x1920 vertical video still counts as 1080p */
function qualityHeight(f: MediaFormat): number {
  if (f.width && f.height) return Math.min(f.width, f.height);
  return f.height || 0;
}

export function getQualityLabel(height: number): string {
  if (height >= 2160) return '4K_ULTRA';
  if (height >= 1440) return '2K_QHD';
  if (height >= 1080) return '1080P_HD';
  if (height >= 720) return '720P_HD';
  if (height >= 480) return '480P_SD';
  if (height > 0) return `${height}P`;
  return 'SOURCE';
}

/**
 * Collapse yt-dlp's format list to one option per resolution, preferring
 * browser-friendly codecs (H.264 > VP9 > AV1), direct HTTP over HLS, then size.
 */
export function extractQualityOptions(metadata: MediaMetadata): QualityOption[] {
  const videoFormats = metadata.formats.filter(hasVideo);
  const bestAudio = metadata.formats
    .filter(f => hasAudio(f) && !hasVideo(f))
    .sort((a, b) => b.filesize - a.filesize)[0];

  const byHeight = new Map<number, MediaFormat>();
  for (const f of videoFormats) {
    const h = qualityHeight(f);
    const current = byHeight.get(h);
    if (!current || compareFormats(f, current) < 0) byHeight.set(h, f);
  }

  return Array.from(byHeight.entries())
    .sort(([a], [b]) => b - a)
    .map(([h, f]) => {
      const withAudio = hasAudio(f);
      return {
        label: getQualityLabel(h),
        resolution: f.width && f.height ? `${f.width}x${f.height}` : (h ? `${h}p` : 'source'),
        formatId: f.formatId,
        codec: (f.vcodec || f.codec || 'unknown').split('.')[0],
        container: f.container,
        filesize: f.filesize + (withAudio ? 0 : bestAudio?.filesize || 0),
        hasAudio: withAudio,
        fps: f.fps
      };
    });
}

function compareFormats(a: MediaFormat, b: MediaFormat): number {
  const codec = codecRank(a.vcodec) - codecRank(b.vcodec);
  if (codec !== 0) return codec;
  const aHls = /m3u8|dash/.test(a.protocol || '') ? 1 : 0;
  const bHls = /m3u8|dash/.test(b.protocol || '') ? 1 : 0;
  if (aHls !== bHls) return aHls - bHls;
  const fps = (b.fps || 0) - (a.fps || 0);
  if (fps !== 0) return fps;
  return (b.filesize || b.tbr || 0) - (a.filesize || a.tbr || 0);
}

export class MediaExtractor {
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<AnalysisResult>>();
  private cacheTimeout = 5 * 60 * 1000;
  private maxCacheEntries = 200;

  constructor(
    private adapterRegistry: AdapterRegistry,
    private ytdlp: YtDlp,
    private timeoutMs = 60_000,
    private retryDelayMs = 1000
  ) {}

  async analyze(url: string): Promise<AnalysisResult> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) return cached.result;

    // Identical concurrent requests share one yt-dlp run
    const pending = this.inflight.get(url);
    if (pending) return pending;

    const promise = this.doAnalyze(url).finally(() => this.inflight.delete(url));
    this.inflight.set(url, promise);
    return promise;
  }

  /** Look up a format from a recent analysis (used to plan the download) */
  getCachedFormat(url: string, formatId: string): MediaFormat | undefined {
    return this.cache.get(url)?.result.metadata.formats?.find(f => f.formatId === formatId);
  }

  private async doAnalyze(url: string): Promise<AnalysisResult> {
    const adapter = this.adapterRegistry.getAdapterForUrl(url);
    if (!adapter) {
      return this.failure({ code: ErrorCode.INVALID_URL, message: 'Unsupported platform or invalid URL', retryable: false });
    }

    try {
      const rawData = await withRetry(() => this.fetchMetadata(url), { retries: 2, baseDelayMs: this.retryDelayMs });
      const metadata = adapter.parseMetadata(rawData);
      const result: AnalysisResult = {
        success: true,
        platform: adapter.name,
        metadata,
        availableQualities: extractQualityOptions(metadata)
      };
      this.remember(url, result);
      return result;
    } catch (error) {
      return this.failure(classifyError(error));
    }
  }

  private failure(error: AnalysisResult['error']): AnalysisResult {
    return { success: false, metadata: {} as MediaMetadata, availableQualities: [], error };
  }

  private remember(url: string, result: AnalysisResult): void {
    this.cache.delete(url);
    this.cache.set(url, { result, timestamp: Date.now() });
    while (this.cache.size > this.maxCacheEntries) {
      const oldest = this.cache.keys().next().value as string;
      this.cache.delete(oldest);
    }
  }

  private async fetchMetadata(url: string): Promise<any> {
    const { stdout } = await this.ytdlp.run(
      ['--dump-single-json', '--no-playlist', '--no-warnings', '--', url],
      this.timeoutMs
    );
    try {
      return JSON.parse(stdout);
    } catch {
      throw new Error('Failed to parse yt-dlp output');
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
