import { spawn } from 'child_process';
import { AnalysisResult, MediaMetadata, QualityOption, ExtractorError, ErrorCode } from '../types';
import { AdapterRegistry } from '../adapters';

export class MediaExtractor {
  private cache: Map<string, { result: AnalysisResult; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    private adapterRegistry: AdapterRegistry,
    private ytdlpPath: string = 'yt-dlp'
  ) {}

  async analyze(url: string): Promise<AnalysisResult> {
    // Check cache
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    try {
      const adapter = this.adapterRegistry.getAdapterForUrl(url);
      if (!adapter) {
        return {
          success: false,
          metadata: {} as MediaMetadata,
          availableQualities: [],
          error: {
            code: ErrorCode.INVALID_URL,
            message: 'Unsupported platform or invalid URL',
            retryable: false
          }
        };
      }

      const rawData = await this.fetchMetadata(url);
      const metadata = adapter.parseMetadata(rawData);
      const availableQualities = this.extractQualityOptions(metadata);

      const result: AnalysisResult = {
        success: true,
        metadata,
        availableQualities
      };

      // Cache the result
      this.cache.set(url, { result, timestamp: Date.now() });

      return result;
    } catch (error: any) {
      const extractorError = this.classifyError(error);
      return {
        success: false,
        metadata: {} as MediaMetadata,
        availableQualities: [],
        error: extractorError
      };
    }
  }

  async getFormats(url: string): Promise<any[]> {
    const rawData = await this.fetchMetadata(url);
    return rawData.formats || [];
  }

  private async fetchMetadata(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = ['--dump-json', '--no-warnings', '--no-playlist', url];
      const process = spawn(this.ytdlpPath, args);

      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error('Analysis timeout after 60 seconds'));
      }, 60000);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse yt-dlp output'));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private extractQualityOptions(metadata: MediaMetadata): QualityOption[] {
    const qualityMap = new Map<string, QualityOption>();

    for (const format of metadata.formats) {
      // Skip audio-only formats for video quality options
      if (!format.vcodec || format.vcodec === 'none') continue;

      const resolution = format.resolution;
      const existing = qualityMap.get(resolution);

      // Keep the format with the largest filesize (usually best quality)
      if (!existing || format.filesize > existing.filesize) {
        qualityMap.set(resolution, {
          label: this.getQualityLabel(resolution),
          resolution,
          formatId: format.formatId,
          codec: format.codec,
          container: format.container,
          filesize: format.filesize
        });
      }
    }

    // Sort by resolution (highest first)
    const qualities = Array.from(qualityMap.values());
    qualities.sort((a, b) => {
      const aHeight = parseInt(a.resolution) || 0;
      const bHeight = parseInt(b.resolution) || 0;
      return bHeight - aHeight;
    });

    return qualities;
  }

  private getQualityLabel(resolution: string): string {
    const height = parseInt(resolution);
    if (height >= 2160) return '4K_ULTRA';
    if (height >= 1440) return '2K_QHD';
    if (height >= 1080) return '1080P_HD';
    if (height >= 720) return '720P_STD';
    if (height >= 480) return '480P';
    return '360P';
  }

  private classifyError(error: Error): ExtractorError {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('econnrefused') || message.includes('etimedout')) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Network error: Check connection and retry',
        retryable: true
      };
    }

    if (message.includes('private') || message.includes('restricted') || message.includes('403')) {
      return {
        code: ErrorCode.ACCESS_DENIED,
        message: 'Access denied: Video is private or restricted',
        retryable: false
      };
    }

    if (message.includes('unavailable') || message.includes('not available') || message.includes('503')) {
      return {
        code: ErrorCode.PLATFORM_UNAVAILABLE,
        message: 'Platform unavailable: Try again later',
        retryable: true
      };
    }

    if (message.includes('not found') || message.includes('404') || message.includes('removed') || message.includes('deleted')) {
      return {
        code: ErrorCode.VIDEO_NOT_FOUND,
        message: 'Video not found: Content no longer available',
        retryable: false
      };
    }

    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'Unknown error occurred',
      retryable: false
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
