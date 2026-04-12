import { Platform, MediaMetadata, ExtractOptions, MediaFormat } from '../types';
import { PlatformAdapter } from './PlatformAdapter';

export class YouTubeAdapter implements PlatformAdapter {
  name = Platform.YOUTUBE;
  urlPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    return match ? match[1] : null;
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args = [url];

    if (options.audioOnly) {
      args.push('-x'); // Extract audio
      args.push('--audio-format', options.format || 'mp3');
      if (options.format === 'mp3') {
        args.push('--audio-quality', '320K');
      }
      args.push('--embed-thumbnail');
      args.push('--add-metadata');
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
      title: rawData.title || 'Unknown',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader || rawData.channel,
      uploadDate: rawData.upload_date
    };
  }
}
