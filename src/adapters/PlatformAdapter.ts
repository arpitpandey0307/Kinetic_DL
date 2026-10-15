import { Platform, MediaMetadata, ExtractOptions, MediaFormat } from '../types';

export interface PlatformAdapter {
  name: Platform;
  /** Matched against the URL's hostname only */
  hostPattern: RegExp;
  /** Used to pull the video id out of the full URL */
  urlPattern: RegExp;
  matches(url: string): boolean;
  extractVideoId(url: string): string | null;
  getYtDlpArgs(url: string, options: ExtractOptions): string[];
  parseMetadata(rawData: any): MediaMetadata;
}

export function hostnameOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Shared yt-dlp behaviour. Platform adapters only declare how to recognise
 * their URLs; argument building and metadata mapping are identical for all.
 */
export abstract class BaseYtDlpAdapter implements PlatformAdapter {
  abstract name: Platform;
  abstract hostPattern: RegExp;
  abstract urlPattern: RegExp;
  protected defaultTitle = 'Video';

  matches(url: string): boolean {
    const host = hostnameOf(url);
    return host !== null && this.hostPattern.test(host);
  }

  extractVideoId(url: string): string | null {
    const match = url.match(this.urlPattern);
    if (!match) return null;
    return match.slice(1).find(Boolean) ?? null;
  }

  getYtDlpArgs(url: string, options: ExtractOptions): string[] {
    const args: string[] = [];

    if (options.audioOnly) {
      const audioFormat = options.audioFormat === 'flac' ? 'flac' : 'mp3';
      args.push('-f', 'bestaudio/best', '-x', '--audio-format', audioFormat);
      // MP3 at 320kbps CBR; FLAC is lossless so quality 0 (best compression)
      args.push('--audio-quality', audioFormat === 'mp3' ? '320K' : '0');
      args.push('--embed-metadata', '--embed-thumbnail');
    } else {
      const id = options.formatId;
      if (id && id !== 'best') {
        args.push('-f', options.formatHasAudio
          ? `${id}/best`
          : `${id}+bestaudio[ext=m4a]/${id}+bestaudio/${id}/best`);
      } else {
        args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best');
      }
      // MP4 container with AAC audio plays everywhere; video is stream-copied
      args.push('--merge-output-format', 'mp4');
      args.push('--postprocessor-args', 'Merger:-c:v copy -c:a aac');
      args.push('--embed-metadata');
    }

    args.push('--no-playlist');
    // "--" stops option parsing so a URL can never be read as a flag
    args.push('--', url);
    return args;
  }

  parseMetadata(rawData: any): MediaMetadata {
    let rawFormats: any[] = Array.isArray(rawData.formats) ? rawData.formats : [];
    // Some extractors return a single direct format with no "formats" list
    if (rawFormats.length === 0 && rawData.url) {
      rawFormats = [{ ...rawData, format_id: rawData.format_id || 'best' }];
    }

    const formats: MediaFormat[] = rawFormats
      .filter(f => f && f.format_id && f.ext !== 'mhtml')
      .map(f => ({
        formatId: String(f.format_id),
        resolution: f.height ? `${f.height}p` : 'audio',
        codec: f.vcodec && f.vcodec !== 'none' ? f.vcodec : f.acodec || 'unknown',
        container: f.ext || 'unknown',
        filesize: f.filesize || f.filesize_approx || 0,
        width: f.width || undefined,
        height: f.height || undefined,
        fps: f.fps || undefined,
        vcodec: f.vcodec,
        acodec: f.acodec,
        protocol: f.protocol,
        tbr: f.tbr || undefined
      }));

    return {
      title: rawData.title || rawData.description || this.defaultTitle,
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      formats,
      author: rawData.uploader || rawData.uploader_id || rawData.channel || rawData.creator,
      uploadDate: rawData.upload_date
    };
  }
}

export class AdapterRegistry {
  private adapters: Map<Platform, PlatformAdapter> = new Map();

  register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getAdapter(platform: Platform): PlatformAdapter | null {
    return this.adapters.get(platform) || null;
  }

  /** Adapters are checked in registration order, so the generic one goes last */
  getAdapterForUrl(url: string): PlatformAdapter | null {
    for (const adapter of this.adapters.values()) {
      if (adapter.matches(url)) return adapter;
    }
    return null;
  }

  getAllAdapters(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }
}
