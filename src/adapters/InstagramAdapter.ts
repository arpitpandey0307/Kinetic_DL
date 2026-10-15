import { Platform } from '../types';
import { BaseYtDlpAdapter } from './PlatformAdapter';

export class InstagramAdapter extends BaseYtDlpAdapter {
  name = Platform.INSTAGRAM;
  hostPattern = /(^|\.)instagram\.com$/;
  urlPattern = /instagram\.com\/(?:[^/]+\/)?(?:p|reels?|tv)\/([a-zA-Z0-9_-]+)|instagram\.com\/stories\/[^/]+\/([0-9]+)/;
  protected defaultTitle = 'Instagram Video';
}
