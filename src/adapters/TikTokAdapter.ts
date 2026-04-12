import { Platform, MediaMetadata, ExtractOptions, MediaFormat } from '../types';
import { PlatformAdapter } from './PlatformAdapter';

export class TikTokAdapter implements PlatformAdapter {
  name = Platform.TIKTOK;
  urlPattern = /tiktok\.com\/@[^\/]+\/video\/([0-9]+)|(?:vm|vt)\.tiktok\.com\/([a-zA-Z0-9]+)/;

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    return match ? (match[1] || match[2]) : null;
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
      args.push('-f', 'bestvideo+bestaudio/best');
      args.push('--merge-output-format', 'mp4');
      args.push('--postprocessor-args', 'ffmpeg:-c:a aac');
    }

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
      title: rawData.title || rawData.description || 'TikTok Video',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader || rawData.creator,
      uploadDate: rawData.upload_date
    };
  }
}
