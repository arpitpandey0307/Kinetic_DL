import { Platform } from '../types';
import { BaseYtDlpAdapter } from './PlatformAdapter';

export const TERABOX_HOST_PATTERN =
  /(^|\.)(terabox\.com|terabox\.app|1024terabox\.com|teraboxapp\.com|1024tera\.com|teraboxlink\.com|freeterabox\.com|teraboxurl\.com|terasharelink\.com|terafileshare\.com|teraboxshare\.com|4funbox\.com|mirrobox\.com|nephobox\.com|momerybox\.com|tibibox\.com)$/;

// TeraBox is not supported by yt-dlp; downloads go through TeraBoxExtractor.
// The adapter exists so the platform is recognised and labelled correctly.
export class TeraboxAdapter extends BaseYtDlpAdapter {
  name = Platform.TERABOX;
  hostPattern = TERABOX_HOST_PATTERN;
  urlPattern = /\/s\/([a-zA-Z0-9_-]+)|[?&]surl=([a-zA-Z0-9_-]+)/;
  protected defaultTitle = 'TeraBox File';
}

export class RedditAdapter extends BaseYtDlpAdapter {
  name = Platform.REDDIT;
  hostPattern = /(^|\.)(reddit\.com|redd\.it)$/;
  urlPattern = /reddit\.com\/r\/[^/]+\/(?:comments|s)\/([a-zA-Z0-9]+)|redd\.it\/([a-zA-Z0-9]+)/;
  protected defaultTitle = 'Reddit Video';
}

export class PinterestAdapter extends BaseYtDlpAdapter {
  name = Platform.PINTEREST;
  hostPattern = /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/;
  urlPattern = /pinterest\.[a-z.]+\/pin\/([0-9]+)|pin\.it\/([a-zA-Z0-9]+)/;
  protected defaultTitle = 'Pinterest Video';
}

export class TwitterAdapter extends BaseYtDlpAdapter {
  name = Platform.TWITTER;
  hostPattern = /(^|\.)(twitter\.com|x\.com)$/;
  urlPattern = /(?:twitter|x)\.com\/[^/]+\/status\/([0-9]+)/;
  protected defaultTitle = 'Twitter Video';
}

export class FacebookAdapter extends BaseYtDlpAdapter {
  name = Platform.FACEBOOK;
  hostPattern = /(^|\.)(facebook\.com|fb\.watch|fb\.com)$/;
  urlPattern = /facebook\.com\/[^/]+\/videos\/(?:[^/]+\/)?([0-9]+)|facebook\.com\/watch\/?\?v=([0-9]+)|facebook\.com\/reel\/([0-9]+)|facebook\.com\/share\/[rv]\/([a-zA-Z0-9]+)|fb\.watch\/([a-zA-Z0-9_-]+)/;
  protected defaultTitle = 'Facebook Video';
}

export class VimeoAdapter extends BaseYtDlpAdapter {
  name = Platform.VIMEO;
  hostPattern = /(^|\.)vimeo\.com$/;
  urlPattern = /player\.vimeo\.com\/video\/([0-9]+)|vimeo\.com\/(?:.*\/)?([0-9]+)/;
  protected defaultTitle = 'Vimeo Video';
}
