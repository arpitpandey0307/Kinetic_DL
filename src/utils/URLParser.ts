import { Platform, ParseResult } from '../types';

export class URLParser {
  private platformPatterns: Map<Platform, RegExp[]> = new Map([
    [Platform.YOUTUBE, [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ]],
    [Platform.INSTAGRAM, [
      /instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/,
      /instagram\.com\/stories\/[^\/]+\/([0-9]+)/
    ]],
    [Platform.TIKTOK, [
      /tiktok\.com\/@[^\/]+\/video\/([0-9]+)/,
      /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
      /vt\.tiktok\.com\/([a-zA-Z0-9]+)/
    ]],
    [Platform.TERABOX, [
      /terabox\.com\/s\/([a-zA-Z0-9_-]+)/,
      /1024terabox\.com\/s\/([a-zA-Z0-9_-]+)/,
      /teraboxapp\.com\/s\/([a-zA-Z0-9_-]+)/,
      /teraboxurl\.com\/s\/([a-zA-Z0-9_-]+)/,
      /freeterabox\.com\/s\/([a-zA-Z0-9_-]+)/,
      /teraboxlink\.com\/s\/([a-zA-Z0-9_-]+)/,
      /terasharelink\.com\/s\/([a-zA-Z0-9_-]+)/,
      /terafileshare\.com\/s\/([a-zA-Z0-9_-]+)/,
      /1024tera\.com\/s\/([a-zA-Z0-9_-]+)/
    ]],
    [Platform.REDDIT, [
      /reddit\.com\/r\/[^\/]+\/comments\/([a-z0-9]+)/,
      /redd\.it\/([a-z0-9]+)/
    ]],
    [Platform.PINTEREST, [
      /pinterest\.com\/pin\/([0-9]+)/,
      /pin\.it\/([a-zA-Z0-9]+)/
    ]],
    [Platform.TWITTER, [
      /twitter\.com\/[^\/]+\/status\/([0-9]+)/,
      /x\.com\/[^\/]+\/status\/([0-9]+)/
    ]],
    [Platform.FACEBOOK, [
      /facebook\.com\/[^\/]+\/videos\/([0-9]+)/,
      /fb\.watch\/([a-zA-Z0-9_-]+)/
    ]],
    [Platform.VIMEO, [
      /vimeo\.com\/([0-9]+)/,
      /player\.vimeo\.com\/video\/([0-9]+)/
    ]]
  ]);

  parse(url: string): ParseResult {
    // Basic URL validation
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        platform: null,
        videoId: null,
        error: 'Invalid URL format'
      };
    }

    // Try to match against each known platform
    for (const [platform, patterns] of this.platformPatterns.entries()) {
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return {
            isValid: true,
            platform,
            videoId: match[1]
          };
        }
      }
    }

    // Fallback: accept any valid http(s) URL as GENERIC platform
    // yt-dlp supports 1000+ sites, so let it try
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return {
          isValid: true,
          platform: Platform.GENERIC,
          videoId: parsed.pathname.replace(/^\//, '') || parsed.hostname
        };
      }
    } catch {
      // Not a valid URL
    }

    return {
      isValid: false,
      platform: null,
      videoId: null,
      error: 'Unsupported platform or invalid URL'
    };
  }

  isSupported(url: string): boolean {
    return this.parse(url).isValid;
  }

  getPlatform(url: string): Platform | null {
    return this.parse(url).platform;
  }
}
