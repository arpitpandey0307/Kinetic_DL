export { PlatformAdapter, AdapterRegistry, BaseYtDlpAdapter, hostnameOf } from './PlatformAdapter';
export { YouTubeAdapter } from './YouTubeAdapter';
export { InstagramAdapter } from './InstagramAdapter';
export { TikTokAdapter } from './TikTokAdapter';
export {
  TeraboxAdapter,
  RedditAdapter,
  PinterestAdapter,
  TwitterAdapter,
  FacebookAdapter,
  VimeoAdapter,
  TERABOX_HOST_PATTERN
} from './OtherAdapters';
export { GenericAdapter } from './GenericAdapter';

import { AdapterRegistry } from './PlatformAdapter';
import { YouTubeAdapter } from './YouTubeAdapter';
import { InstagramAdapter } from './InstagramAdapter';
import { TikTokAdapter } from './TikTokAdapter';
import {
  TeraboxAdapter,
  RedditAdapter,
  PinterestAdapter,
  TwitterAdapter,
  FacebookAdapter,
  VimeoAdapter
} from './OtherAdapters';
import { GenericAdapter } from './GenericAdapter';

// Create and configure the adapter registry
export function createAdapterRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();

  // Platform-specific adapters first (they take priority)
  registry.register(new YouTubeAdapter());
  registry.register(new InstagramAdapter());
  registry.register(new TikTokAdapter());
  registry.register(new TeraboxAdapter());
  registry.register(new RedditAdapter());
  registry.register(new PinterestAdapter());
  registry.register(new TwitterAdapter());
  registry.register(new FacebookAdapter());
  registry.register(new VimeoAdapter());

  // Generic adapter LAST as catch-all fallback
  registry.register(new GenericAdapter());

  return registry;
}
