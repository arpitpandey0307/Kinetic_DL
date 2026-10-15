import { ParseResult } from '../types';
import { AdapterRegistry, createAdapterRegistry, hostnameOf } from '../adapters';

const MAX_URL_LENGTH = 2048;

/**
 * Validates URLs and detects the platform. Platform recognition is delegated
 * to the adapter registry so there is a single source of truth for patterns.
 */
export class URLParser {
  constructor(private registry: AdapterRegistry = createAdapterRegistry()) {}

  parse(url: string): ParseResult {
    if (!url || typeof url !== 'string') {
      return { isValid: false, platform: null, videoId: null, error: 'Invalid URL format' };
    }

    const trimmed = url.trim();
    if (trimmed.length > MAX_URL_LENGTH) {
      return { isValid: false, platform: null, videoId: null, error: 'URL is too long' };
    }

    if (hostnameOf(trimmed) === null) {
      return {
        isValid: false,
        platform: null,
        videoId: null,
        error: 'Unsupported platform or invalid URL (must start with http:// or https://)'
      };
    }

    const adapter = this.registry.getAdapterForUrl(trimmed);
    if (!adapter) {
      return { isValid: false, platform: null, videoId: null, error: 'Unsupported platform or invalid URL' };
    }

    return {
      isValid: true,
      platform: adapter.name,
      videoId: adapter.extractVideoId(trimmed)
    };
  }

  isSupported(url: string): boolean {
    return this.parse(url).isValid;
  }

  getPlatform(url: string) {
    return this.parse(url).platform;
  }
}
