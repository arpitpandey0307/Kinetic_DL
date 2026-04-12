import { Platform, MediaMetadata, ExtractOptions, MediaFormat } from '../types';
import { PlatformAdapter } from './PlatformAdapter';

// Terabox Adapter
export class TeraboxAdapter implements PlatformAdapter {
  name = Platform.TERABOX;
  urlPattern = /(?:terabox|1024terabox)\.com\/s\/([a-zA-Z0-9_-]+)/;

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    return match ? match[1] : null;
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args = [url];
    if (options.audioOnly) {
      args.push('-x', '--audio-format', options.format || 'mp3');
      if (options.format === 'mp3') args.push('--audio-quality', '320K');
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
      title: rawData.title || 'Terabox Video',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader,
      uploadDate: rawData.upload_date
    };
  }
}

// Reddit Adapter
export class RedditAdapter implements PlatformAdapter {
  name = Platform.REDDIT;
  urlPattern = /reddit\.com\/r\/[^\/]+\/comments\/([a-z0-9]+)|redd\.it\/([a-z0-9]+)/;

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    return match ? (match[1] || match[2]) : null;
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args = [url];
    if (options.audioOnly) {
      args.push('-x', '--audio-format', options.format || 'mp3');
      if (options.format === 'mp3') args.push('--audio-quality', '320K');
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
      title: rawData.title || 'Reddit Video',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader,
      uploadDate: rawData.upload_date
    };
  }
}

// Pinterest Adapter
export class PinterestAdapter implements PlatformAdapter {
  name = Platform.PINTEREST;
  urlPattern = /pinterest\.com\/pin\/([0-9]+)|pin\.it\/([a-zA-Z0-9]+)/;

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    return match ? (match[1] || match[2]) : null;
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args = [url];
    if (options.audioOnly) {
      args.push('-x', '--audio-format', options.format || 'mp3');
      if (options.format === 'mp3') args.push('--audio-quality', '320K');
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
      title: rawData.title || 'Pinterest Video',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader,
      uploadDate: rawData.upload_date
    };
  }
}

// Twitter Adapter
export class TwitterAdapter implements PlatformAdapter {
  name = Platform.TWITTER;
  urlPattern = /(?:twitter|x)\.com\/[^\/]+\/status\/([0-9]+)/;

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    return match ? match[1] : null;
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args = [url];
    if (options.audioOnly) {
      args.push('-x', '--audio-format', options.format || 'mp3');
      if (options.format === 'mp3') args.push('--audio-quality', '320K');
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
      title: rawData.title || rawData.description || 'Twitter Video',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader || rawData.uploader_id,
      uploadDate: rawData.upload_date
    };
  }
}

// Facebook Adapter
export class FacebookAdapter implements PlatformAdapter {
  name = Platform.FACEBOOK;
  urlPattern = /facebook\.com\/[^\/]+\/videos\/([0-9]+)|fb\.watch\/([a-zA-Z0-9_-]+)/;

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    return match ? (match[1] || match[2]) : null;
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args = [url];
    if (options.audioOnly) {
      args.push('-x', '--audio-format', options.format || 'mp3');
      if (options.format === 'mp3') args.push('--audio-quality', '320K');
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
      title: rawData.title || 'Facebook Video',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader,
      uploadDate: rawData.upload_date
    };
  }
}

// Vimeo Adapter
export class VimeoAdapter implements PlatformAdapter {
  name = Platform.VIMEO;
  urlPattern = /vimeo\.com\/([0-9]+)|player\.vimeo\.com\/video\/([0-9]+)/;

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    return match ? (match[1] || match[2]) : null;
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args = [url];
    if (options.audioOnly) {
      args.push('-x', '--audio-format', options.format || 'mp3');
      if (options.format === 'mp3') args.push('--audio-quality', '320K');
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
      title: rawData.title || 'Vimeo Video',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader || rawData.uploader_id,
      uploadDate: rawData.upload_date
    };
  }
}
