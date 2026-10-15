import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { TERABOX_HOST_PATTERN, hostnameOf } from '../adapters';
import { ClassifiedError } from '../utils/errors';
import { ErrorCode } from '../types';

export interface TeraBoxFile {
  filename: string;
  size: number;
  dlink: string;
  thumbnail: string;
}

export interface TeraBoxResult {
  success: boolean;
  title: string;
  files: TeraBoxFile[];
  thumbnail: string;
  error?: string;
}

export interface TeraBoxStream {
  m3u8Content: string;
  streamUrl: string;
  cookies: string;
  referer: string;
  filename: string;
  thumbnail: string;
}

type ProgressFn = (downloaded: number, total: number) => void;

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_BODY = 10 * 1024 * 1024;

export class TeraBoxExtractor {
  private readonly UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

  constructor(private ffmpegPath = 'ffmpeg') {}

  /** True only when the URL's hostname is a known TeraBox domain */
  static isTeraBoxUrl(url: string): boolean {
    const host = hostnameOf(url);
    return host !== null && TERABOX_HOST_PATTERN.test(host);
  }

  static safeFilename(name: string): string {
    const cleaned = name
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/^\.+/, '')
      .trim()
      .slice(0, 180);
    return cleaned || 'terabox_file';
  }

  async extract(shareUrl: string): Promise<TeraBoxResult> {
    const fail = (error: string): TeraBoxResult => ({ success: false, title: '', files: [], thumbnail: '', error });
    try {
      const normalizedUrl = this.normalizeUrl(shareUrl);
      const { body, cookies, finalUrl } = await this.httpGet(normalizedUrl);
      const jsToken = this.extractJsToken(body);
      const { fullSurl, strippedSurl } = this.extractSurl(shareUrl, finalUrl);
      if (!fullSurl && !strippedSurl) return fail('Could not read the share id from this TeraBox URL');

      if (strippedSurl && cookies) {
        const listResult = await this.fetchFileList(
          `https://www.terabox.com/share/list?app_id=250528&shorturl=${strippedSurl}&root=1&dir=%2F&page=1&num=20&order=time&by=desc` +
            (jsToken ? `&jsToken=${encodeURIComponent(jsToken)}` : ''),
          cookies, finalUrl
        );
        if (listResult.success) return listResult;
      }

      if (fullSurl && cookies) {
        const infoResult = await this.fetchFileList(
          `https://www.terabox.com/api/shorturlinfo?app_id=250528&shorturl=${fullSurl}&jsToken=${encodeURIComponent(jsToken || '')}&root=1`,
          cookies, finalUrl
        );
        if (infoResult.success) return infoResult;
      }

      const htmlResult = this.parsePageData(body);
      if (htmlResult.success) return htmlResult;

      return fail('Could not read file info from TeraBox. The link may be expired or private.');
    } catch (error: any) {
      return fail(`TeraBox error: ${error.message}`);
    }
  }

  private normalizeUrl(url: string): string {
    const shortMatch = url.match(/\/s\/1?([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.terabox.com/sharing/link?surl=${shortMatch[1]}`;
    const surlMatch = url.match(/[?&]surl=([a-zA-Z0-9_-]+)/);
    if (surlMatch) return `https://www.terabox.com/sharing/link?surl=${surlMatch[1]}`;
    return url;
  }

  private extractJsToken(html: string): string | null {
    const evalMatch = html.match(/eval\(decodeURIComponent\(`([^`]+)`\)\)/);
    if (evalMatch) {
      try {
        const tokenMatch = decodeURIComponent(evalMatch[1]).match(/fn\("([^"]+)"\)/);
        if (tokenMatch) return tokenMatch[1];
      } catch {
        // ignore decode error
      }
    }
    const directMatch = html.match(/window\.jsToken\s*=\s*"([^"]+)"/) || html.match(/jsToken\s*:\s*"([^"]+)"/);
    return directMatch ? directMatch[1] : null;
  }

  private extractSurl(originalUrl: string, finalUrl: string): { fullSurl: string | null; strippedSurl: string | null } {
    for (const url of [originalUrl, finalUrl]) {
      const pathMatch = url.match(/\/s\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) {
        const raw = pathMatch[1];
        return { fullSurl: raw, strippedSurl: raw.startsWith('1') ? raw.substring(1) : raw };
      }
    }
    for (const url of [finalUrl, originalUrl]) {
      const surlMatch = url.match(/[?&]surl=([a-zA-Z0-9_-]+)/);
      if (surlMatch) return { fullSurl: '1' + surlMatch[1], strippedSurl: surlMatch[1] };
    }
    return { fullSurl: null, strippedSurl: null };
  }

  private mapFiles(list: any[]): TeraBoxFile[] {
    return list
      .filter((f: any) => f.isdir !== 1 && f.isdir !== '1')
      .map((f: any) => ({
        filename: f.server_filename || f.filename || f.name || 'file',
        size: parseInt(f.size) || 0,
        dlink: String(f.dlink || '').replace(/\\u002F/g, '/').replace(/\\\//g, '/'),
        thumbnail: String(f.thumbs?.url3 || f.thumbs?.url2 || f.thumbs?.url1 || f.thumbnail || '').replace(/\\u002F/g, '/')
      }));
  }

  private async fetchFileList(apiUrl: string, cookies: string, referer: string): Promise<TeraBoxResult> {
    try {
      const { body } = await this.httpGet(apiUrl, { Cookie: cookies, Referer: referer, Accept: 'application/json, text/plain, */*' });
      const data = JSON.parse(body);
      if (data.errno === 0 && Array.isArray(data.list)) {
        const files = this.mapFiles(data.list);
        if (files.length > 0) {
          return { success: true, title: data.title || files[0].filename, files, thumbnail: files[0].thumbnail };
        }
      }
      return { success: false, title: '', files: [], thumbnail: '', error: `TeraBox API errno ${data.errno}` };
    } catch (e: any) {
      return { success: false, title: '', files: [], thumbnail: '', error: `TeraBox API error: ${e.message}` };
    }
  }

  private parsePageData(html: string): TeraBoxResult {
    let title = '';
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\s*[-–|]?\s*TeraBox.*$/i, '').replace(/\s*-\s*Share Files.*$/i, '').trim();
    }

    for (const pattern of [/"file_list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/, /"list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/]) {
      const match = html.match(pattern);
      if (!match) continue;
      try {
        const data = match[1]
          .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/\\u002F/g, '/');
        const parsed = JSON.parse(data);
        const files = this.mapFiles(Array.isArray(parsed) ? parsed : []);
        if (files.length > 0) {
          return { success: true, title: title || files[0].filename, files, thumbnail: files[0].thumbnail };
        }
      } catch {
        // JSON parse failed, try next pattern
      }
    }
    return { success: false, title, files: [], thumbnail: '', error: 'No downloadable files found in page data' };
  }

  /** GET with redirect following and cookie accumulation across redirects */
  private httpGet(
    url: string,
    extraHeaders: Record<string, string> = {},
    maxRedirects = 10,
    accumulatedCookies = ''
  ): Promise<{ body: string; cookies: string; finalUrl: string }> {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

      const parsedUrl = new URL(url);
      const cookieHeader = this.mergeCookies(accumulatedCookies, extraHeaders.Cookie || '');
      const headers: Record<string, string> = {
        'User-Agent': this.UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        ...extraHeaders
      };
      if (cookieHeader) headers.Cookie = cookieHeader;

      const proto = parsedUrl.protocol === 'https:' ? https : http;
      const req = proto.request(
        { hostname: parsedUrl.hostname, path: parsedUrl.pathname + parsedUrl.search, method: 'GET', headers },
        res => {
          const setCookies = res.headers['set-cookie'] || [];
          const mergedCookies = this.mergeCookies(cookieHeader, setCookies.map(c => c.split(';')[0]).join('; '));

          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            const redirectUrl = new URL(res.headers.location, parsedUrl).toString();
            const { Cookie: _drop, ...rest } = extraHeaders;
            this.httpGet(redirectUrl, rest, maxRedirects - 1, mergedCookies).then(resolve, reject);
            return;
          }

          let body = '';
          res.setEncoding('utf8');
          res.on('data', chunk => {
            body += chunk;
            if (body.length > MAX_BODY) req.destroy(new Error('Response too large'));
          });
          res.on('end', () => resolve({ body, cookies: mergedCookies, finalUrl: url }));
          res.on('error', reject);
        }
      );
      req.on('error', reject);
      req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('Request timeout')));
      req.end();
    });
  }

  private mergeCookies(existing: string, newer: string): string {
    const map = new Map<string, string>();
    for (const str of [existing, newer]) {
      for (const pair of (str || '').split(';')) {
        const trimmed = pair.trim();
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) map.set(trimmed.substring(0, eqIdx).trim(), trimmed.substring(eqIdx + 1).trim());
      }
    }
    return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  /** Fetch an HLS (M3U8) playlist for the first video in a share — no login needed */
  async getM3U8StreamUrl(shareUrl: string): Promise<TeraBoxStream | null> {
    try {
      const { fullSurl, strippedSurl } = this.extractSurl(shareUrl, this.normalizeUrl(shareUrl));
      if (!strippedSurl || !fullSurl) return null;

      const { body, cookies, finalUrl } = await this.httpGet(`https://www.terabox.com/sharing/link?surl=${strippedSurl}`);
      const jsToken = this.extractJsToken(body);
      if (!jsToken || !cookies) return null;

      const { body: infoBody } = await this.httpGet(
        `https://www.terabox.com/api/shorturlinfo?app_id=250528&shorturl=${fullSurl}&jsToken=${encodeURIComponent(jsToken)}&root=1`,
        { Cookie: cookies, Referer: finalUrl, Accept: 'application/json, text/plain, */*' }
      );
      const info = JSON.parse(infoBody);
      if (info.errno !== 0 || !Array.isArray(info.list)) return null;

      const file = info.list.find((f: any) => f.isdir !== 1 && f.isdir !== '1');
      if (!file) return null;

      for (const type of ['M3U8_AUTO_720', 'M3U8_AUTO_480', 'M3U8_AUTO_360', 'M3U8_FLV_264_480']) {
        const streamUrl = 'https://www.terabox.com/share/streaming?' +
          `type=${type}&app_id=250528&shorturl=${fullSurl}&fid=${file.fs_id}&channel=dubox&clienttype=0` +
          `&uk=${info.uk}&shareid=${info.shareid}&sign=${encodeURIComponent(info.sign)}` +
          `&timestamp=${info.timestamp}&jsToken=${encodeURIComponent(jsToken)}`;
        try {
          const { body: m3u8Body } = await this.httpGet(streamUrl, { Cookie: cookies, Referer: finalUrl, Accept: '*/*' });
          if (m3u8Body.startsWith('#EXTM3U')) {
            return {
              m3u8Content: this.absolutizePlaylist(m3u8Body, streamUrl),
              streamUrl,
              cookies,
              referer: finalUrl,
              filename: file.server_filename || 'video.mp4',
              thumbnail: file.thumbs?.url3 || file.thumbs?.url2 || file.thumbs?.url1 || ''
            };
          }
        } catch {
          // try the next resolution
        }
      }
      return null;
    } catch (error: any) {
      console.error('[TeraBox M3U8] Error:', error.message);
      return null;
    }
  }

  /** Make every segment URI absolute so the playlist works from any location */
  private absolutizePlaylist(content: string, baseUrl: string): string {
    return content
      .split(/\r?\n/)
      .map(line => (line && !line.startsWith('#') ? new URL(line.trim(), baseUrl).toString() : line))
      .join('\n');
  }

  /** Download a file via its direct link, with cancel support and a size cap */
  downloadFile(
    dlink: string,
    destPath: string,
    referer: string,
    onProgress?: ProgressFn,
    signal?: AbortSignal,
    maxBytes = 0
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const fail = (err: Error) => {
        fs.rm(destPath, { force: true }, () => reject(err));
      };

      const makeRequest = (reqUrl: string, redirectsLeft: number) => {
        if (redirectsLeft <= 0) return fail(new Error('Too many redirects'));
        let parsed: URL;
        try {
          parsed = new URL(reqUrl);
        } catch {
          return fail(new Error('Invalid TeraBox download link'));
        }

        const p = parsed.protocol === 'https:' ? https : http;
        const req = p.request(
          {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: { 'User-Agent': this.UA, Referer: referer, Accept: '*/*' },
            signal
          },
          res => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              res.resume();
              makeRequest(new URL(res.headers.location, parsed).toString(), redirectsLeft - 1);
              return;
            }
            if (!res.statusCode || res.statusCode >= 400) {
              res.resume();
              return fail(new Error(`Download failed with status ${res.statusCode}`));
            }

            const total = parseInt(res.headers['content-length'] || '0', 10);
            if (maxBytes > 0 && total > maxBytes) {
              res.destroy();
              return fail(new ClassifiedError({ code: ErrorCode.FILE_TOO_LARGE, message: 'File exceeds the server size limit', retryable: false }));
            }

            let downloaded = 0;
            const fileStream = fs.createWriteStream(destPath);
            res.on('data', (chunk: Buffer) => {
              downloaded += chunk.length;
              if (maxBytes > 0 && downloaded > maxBytes) {
                res.destroy(new ClassifiedError({ code: ErrorCode.FILE_TOO_LARGE, message: 'File exceeds the server size limit', retryable: false }));
                return;
              }
              onProgress?.(downloaded, total);
            });
            res.on('error', err => {
              fileStream.destroy();
              fail(err);
            });
            fileStream.on('error', fail);
            fileStream.on('finish', () => resolve());
            res.pipe(fileStream);
          }
        );
        req.on('error', fail);
        req.setTimeout(120_000, () => req.destroy(new Error('Download timeout')));
        req.end();
      };

      makeRequest(dlink, 10);
    });
  }

  /**
   * TeraBox only hands out direct links to logged-in accounts, but the HLS
   * preview stream is public. Remux that stream into an MP4 with ffmpeg.
   */
  async downloadViaStream(
    shareUrl: string,
    destPath: string,
    workDir: string,
    onProgress?: ProgressFn,
    signal?: AbortSignal
  ): Promise<void> {
    const stream = await this.getM3U8StreamUrl(shareUrl);
    if (!stream) {
      throw new ClassifiedError({
        code: ErrorCode.ACCESS_DENIED,
        message: 'TeraBox refused to provide this file (link expired, private, or not a video)',
        retryable: true
      });
    }

    const playlistPath = path.join(workDir, 'playlist.m3u8');
    fs.writeFileSync(playlistPath, stream.m3u8Content);
    const duration = Array.from(stream.m3u8Content.matchAll(/#EXTINF:([\d.]+)/g))
      .reduce((sum, m) => sum + parseFloat(m[1]), 0);

    await new Promise<void>((resolve, reject) => {
      const ff = spawn(this.ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-nostats',
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
        '-user_agent', this.UA,
        '-i', playlistPath,
        '-c', 'copy', '-bsf:a', 'aac_adtstoasc',
        '-progress', 'pipe:1', '-y', destPath
      ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

      let stderr = '';
      let settled = false;
      const settle = (err?: Error) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', onAbort);
        fs.rm(playlistPath, { force: true }, () => (err ? reject(err) : resolve()));
      };
      const onAbort = () => {
        ff.kill('SIGKILL');
        settle(new Error('Download cancelled'));
      };
      signal?.addEventListener('abort', onAbort);

      let outTimeUs = 0;
      ff.stdout.on('data', chunk => {
        for (const line of chunk.toString().split('\n')) {
          const [key, value] = line.trim().split('=');
          if (key === 'out_time_us') outTimeUs = Number(value) || outTimeUs;
          if (key === 'total_size' && duration > 0) {
            const size = Number(value) || 0;
            const fraction = Math.min(0.999, outTimeUs / 1e6 / duration);
            onProgress?.(size, fraction > 0 ? Math.round(size / fraction) : 0);
          }
        }
      });
      ff.stderr.on('data', d => (stderr = (stderr + d.toString()).slice(-2000)));
      ff.on('error', err => settle(err));
      ff.on('close', code => {
        if (code === 0) settle();
        else settle(new Error(`ffmpeg failed to remux TeraBox stream: ${stderr.trim().split('\n').pop() || code}`));
      });
    });
  }
}
