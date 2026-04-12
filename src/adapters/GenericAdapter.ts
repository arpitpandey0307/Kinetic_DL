import { Platform, MediaMetadata, ExtractOptions, MediaFormat } from '../types';
import { PlatformAdapter } from './PlatformAdapter';

/**
 * Generic catch-all adapter for any URL that yt-dlp can handle.
 * Registered LAST in the registry so platform-specific adapters take priority.
 */
export class GenericAdapter implements PlatformAdapter {
  name = Platform.GENERIC;
  // Matches any http or https URL
  urlPattern = /^https?:\/\/.+/;

  extractVideoId(url: string): string | null {
    // For generic URLs, use the full URL as the identifier
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\//, '') || parsed.hostname;
    } catch {
      return null;
    }
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args = [url];

    if (options.audioOnly) {
      args.push('-x');
      args.push('--audio-format', options.format || 'mp3');
      if (options.format === 'mp3') {
        args.push('--audio-quality', '320K');
      }
    } else if (options.formatId) {
      args.push('-f', `${options.formatId}+bestaudio/best`);
      args.push('--merge-output-format', 'mp4');
      args.push('--postprocessor-args', 'ffmpeg:-c:a aac');
    } else {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best');
      args.push('--merge-output-format', 'mp4');
      args.push('--postprocessor-args', 'ffmpeg:-c:a aac');
    }

    args.push('--no-playlist');
    args.push('--no-warnings');

    return args;
  }

  parseMetadata(rawData: any): MediaMetadata {
    const formats: MediaFormat[] = (rawData.formats || []).map((f: any) => ({
      formatId: f.format_id,
      resolution: f.height ? `${f.height}p` : 'audio',
      codec: f.vcodec && f.vcodec !== 'none' ? f.vcodec : f.acodec || 'unknown',
      container: f.ext || 'unknown',
      filesize: f.filesize || f.filesize_approx || 0,
      fps: f.fps,
      vcodec: f.vcodec,
      acodec: f.acodec
    }));

    return {
      title: rawData.title || rawData.description || 'Video',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader || rawData.uploader_id || rawData.channel,
      uploadDate: rawData.upload_date
    };
  }
}
