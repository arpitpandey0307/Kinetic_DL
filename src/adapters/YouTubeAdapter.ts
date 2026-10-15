import { Platform } from '../types';
import { BaseYtDlpAdapter } from './PlatformAdapter';

export class YouTubeAdapter extends BaseYtDlpAdapter {
  name = Platform.YOUTUBE;
  hostPattern = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/;
  urlPattern = /(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([a-zA-Z0-9_-]{11})/;
  protected defaultTitle = 'YouTube Video';
}
