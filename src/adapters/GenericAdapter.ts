import { Platform } from '../types';
import { BaseYtDlpAdapter, hostnameOf } from './PlatformAdapter';

/**
 * Catch-all adapter for any http(s) URL that yt-dlp may support.
 * Registered LAST so platform-specific adapters take priority.
 */
export class GenericAdapter extends BaseYtDlpAdapter {
  name = Platform.GENERIC;
  hostPattern = /.+/;
  urlPattern = /^https?:\/\/[^/]+\/?(.*)$/;

  extractVideoId(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\//, '') || parsed.hostname;
    } catch {
      return null;
    }
  }

  matches(url: string): boolean {
    return hostnameOf(url) !== null;
  }
}
