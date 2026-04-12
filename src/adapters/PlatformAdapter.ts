import { Platform, MediaMetadata, ExtractOptions } from '../types';

export interface PlatformAdapter {
  name: Platform;
  urlPattern: RegExp;
  extractVideoId(url: string): string | null;
  getYtDlpArgs(url: string, options: ExtractOptions): string[];
  parseMetadata(rawData: any): MediaMetadata;
}

export class AdapterRegistry {
  private adapters: Map<Platform, PlatformAdapter> = new Map();

  register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getAdapter(platform: Platform): PlatformAdapter | null {
    return this.adapters.get(platform) || null;
  }

  getAdapterForUrl(url: string): PlatformAdapter | null {
    for (const adapter of this.adapters.values()) {
      if (adapter.urlPattern.test(url)) {
        return adapter;
      }
    }
    return null;
  }

  getAllAdapters(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }
}
