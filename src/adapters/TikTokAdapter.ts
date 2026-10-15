import { Platform } from '../types';
import { BaseYtDlpAdapter } from './PlatformAdapter';

export class TikTokAdapter extends BaseYtDlpAdapter {
  name = Platform.TIKTOK;
  hostPattern = /(^|\.)tiktok\.com$/;
  urlPattern = /tiktok\.com\/@[^/]+\/video\/([0-9]+)|(?:vm|vt)\.tiktok\.com\/([a-zA-Z0-9]+)|tiktok\.com\/t\/([a-zA-Z0-9]+)/;
  protected defaultTitle = 'TikTok Video';
}
