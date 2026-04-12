import https from 'https';
import http from 'http';
import { URL } from 'url';

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

export class TeraBoxExtractor {
  private readonly UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

  // Check if a URL is a TeraBox link
  static isTeraBoxUrl(url: string): boolean {
    return /terabox\.com|teraboxapp\.com|1024tera\.com|teraboxlink\.com|freeterabox\.com|teraboxurl\.com|terasharelink\.com|terafileshare\.com/i.test(url);
  }

  async extract(shareUrl: string): Promise<TeraBoxResult> {
    try {
      const normalizedUrl = this.normalizeUrl(shareUrl);
      console.log('[TeraBox] Normalized URL:', normalizedUrl);

      // Step 1: Fetch the share page HTML (follows redirects, collects ALL cookies)
      const { body, cookies, finalUrl } = await this.httpGet(normalizedUrl);
      console.log('[TeraBox] Got HTML, length:', body.length, 'cookies:', cookies.substring(0, 80));
      console.log('[TeraBox] Final URL after redirects:', finalUrl);

      // Step 2: Extract jsToken from the HTML
      const jsToken = this.extractJsToken(body);
      console.log('[TeraBox] jsToken:', jsToken ? jsToken.substring(0, 30) + '...' : 'NOT FOUND');

      // Step 3: Extract surl (both full with leading '1' and stripped versions)
      const { fullSurl, strippedSurl } = this.extractSurl(shareUrl, finalUrl);
      console.log('[TeraBox] fullSurl:', fullSurl, 'strippedSurl:', strippedSurl);

      if (!fullSurl && !strippedSurl) {
        return { success: false, title: '', files: [], thumbnail: '', error: 'Could not extract surl from URL' };
      }

      // Step 4: Try share/list API first (works with stripped surl)
      if (strippedSurl && cookies) {
        console.log('[TeraBox] Trying share/list API with stripped surl...');
        const listResult = await this.fetchShareList(strippedSurl, jsToken || '', cookies, body, finalUrl);
        if (listResult.success && listResult.files.length > 0) {
          console.log('[TeraBox] share/list API success! Files:', listResult.files.length);
          return listResult;
        }
        console.log('[TeraBox] share/list API failed:', listResult.error);
      }

      // Step 5: Try shorturlinfo API (needs FULL surl with leading '1')
      if (fullSurl && cookies) {
        console.log('[TeraBox] Trying shorturlinfo API with full surl...');
        const apiResult = await this.fetchShorturlInfo(fullSurl, jsToken || '', cookies, finalUrl);
        if (apiResult.success && apiResult.files.length > 0) {
          console.log('[TeraBox] shorturlinfo API success! Files:', apiResult.files.length);
          return apiResult;
        }
        console.log('[TeraBox] shorturlinfo API failed:', apiResult.error);
      }

      // Step 6: Try parsing embedded data from HTML as last resort
      const htmlResult = this.parsePageData(body);
      if (htmlResult.success) return htmlResult;

      return {
        success: false,
        title: '',
        files: [],
        thumbnail: '',
        error: 'Could not extract file info from TeraBox. The link may be expired or private.'
      };

    } catch (error: any) {
      console.error('[TeraBox] Extraction error:', error.message);
      return {
        success: false,
        title: '',
        files: [],
        thumbnail: '',
        error: `TeraBox error: ${error.message}`
      };
    }
  }

  private normalizeUrl(url: string): string {
    // Normalize all TeraBox domains to www.terabox.com
    let normalized = url
      .replace(/teraboxapp\.com/i, 'www.terabox.com')
      .replace(/1024tera\.com/i, 'www.terabox.com')
      .replace(/teraboxlink\.com/i, 'www.terabox.com')
      .replace(/freeterabox\.com/i, 'www.terabox.com')
      .replace(/teraboxurl\.com/i, 'www.terabox.com')
      .replace(/terasharelink\.com/i, 'www.terabox.com')
      .replace(/terafileshare\.com/i, 'www.terabox.com')
      .replace(/(?<!www\.)terabox\.com/i, 'www.terabox.com');

    // Convert /s/1XXXXX to /sharing/link?surl=XXXXX
    // For the page load URL, strip the leading 1 from surl (TeraBox page expects this)
    const shortMatch = normalized.match(/\/s\/(1?)([a-zA-Z0-9_-]+)/);
    if (shortMatch) {
      // The page URL uses the stripped surl
      normalized = `https://www.terabox.com/sharing/link?surl=${shortMatch[2]}`;
    }

    return normalized;
  }

  private extractJsToken(html: string): string | null {
    // Pattern 1: eval(decodeURIComponent(`function fn(a){window.jsToken = a};fn("TOKEN")`))
    const evalMatch = html.match(/eval\(decodeURIComponent\(`([^`]+)`\)\)/);
    if (evalMatch) {
      try {
        const decoded = decodeURIComponent(evalMatch[1]);
        const tokenMatch = decoded.match(/fn\("([^"]+)"\)/);
        if (tokenMatch) return tokenMatch[1];
      } catch (e) {
        // ignore decode error
      }
    }

    // Pattern 2: window.jsToken = "TOKEN"
    const directMatch = html.match(/window\.jsToken\s*=\s*"([^"]+)"/);
    if (directMatch) return directMatch[1];

    // Pattern 3: jsToken:"TOKEN"
    const jsonMatch = html.match(/jsToken\s*:\s*"([^"]+)"/);
    if (jsonMatch) return jsonMatch[1];

    return null;
  }

  private extractSurl(originalUrl: string, finalUrl: string): { fullSurl: string | null; strippedSurl: string | null } {
    let fullSurl: string | null = null;
    let strippedSurl: string | null = null;

    // Extract from /s/ path in original URL (has the leading 1)
    for (const url of [originalUrl, finalUrl]) {
      const pathMatch = url.match(/\/s\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) {
        const raw = pathMatch[1];
        fullSurl = raw; // Keep full value (e.g., 1OB7ngRLALsH8y2e_TmWfWQ)
        strippedSurl = raw.startsWith('1') ? raw.substring(1) : raw; // Strip leading 1
        return { fullSurl, strippedSurl };
      }
    }

    // Extract from ?surl= query parameter (already stripped by TeraBox)
    for (const url of [finalUrl, originalUrl]) {
      const surlMatch = url.match(/[?&]surl=([a-zA-Z0-9_-]+)/);
      if (surlMatch) {
        strippedSurl = surlMatch[1];
        fullSurl = '1' + surlMatch[1]; // Add leading 1 for shorturlinfo
        return { fullSurl, strippedSurl };
      }
    }

    return { fullSurl: null, strippedSurl: null };
  }

  private async fetchShorturlInfo(surl: string, jsToken: string, cookies: string, referer: string): Promise<TeraBoxResult> {
    try {
      const apiUrl = `https://www.terabox.com/api/shorturlinfo?app_id=250528&shorturl=${surl}&jsToken=${encodeURIComponent(jsToken)}&root=1`;
      console.log('[TeraBox] API URL:', apiUrl.substring(0, 120) + '...');

      const { body } = await this.httpGet(apiUrl, {
        'Cookie': cookies,
        'Referer': referer,
        'Accept': 'application/json, text/plain, */*'
      });

      console.log('[TeraBox] API response (first 300):', body.substring(0, 300));

      const data = JSON.parse(body);

      if (data.errno === 0 && data.list && data.list.length > 0) {
        const files: TeraBoxFile[] = data.list
          .filter((f: any) => f.isdir !== 1 && f.isdir !== '1')
          .map((f: any) => ({
            filename: f.server_filename || f.filename || 'file',
            size: parseInt(f.size) || 0,
            dlink: (f.dlink || '').replace(/\\\//g, '/'),
            thumbnail: f.thumbs?.url3 || f.thumbs?.url2 || f.thumbs?.url1 || ''
          }));

        if (files.length > 0) {
          return {
            success: true,
            title: data.title || files[0].filename,
            files,
            thumbnail: files[0].thumbnail
          };
        }
      }

      return { success: false, title: '', files: [], thumbnail: '', error: `API errno: ${data.errno}, msg: ${data.errmsg || 'unknown'}` };
    } catch (e: any) {
      return { success: false, title: '', files: [], thumbnail: '', error: `API error: ${e.message}` };
    }
  }

  private async fetchShareList(surl: string, jsToken: string, cookies: string, html: string, referer: string): Promise<TeraBoxResult> {
    try {
      let apiUrl = `https://www.terabox.com/share/list?app_id=250528&shorturl=${surl}&root=1&dir=%2F&page=1&num=20&order=time&by=desc`;
      if (jsToken) apiUrl += `&jsToken=${encodeURIComponent(jsToken)}`;

      const { body } = await this.httpGet(apiUrl, {
        'Cookie': cookies,
        'Referer': referer,
        'Accept': 'application/json, text/plain, */*'
      });

      console.log('[TeraBox] share/list response (first 300):', body.substring(0, 300));

      const data = JSON.parse(body);

      if (data.errno === 0 && data.list && data.list.length > 0) {
        const files: TeraBoxFile[] = data.list
          .filter((f: any) => f.isdir !== 1 && f.isdir !== '1')
          .map((f: any) => ({
            filename: f.server_filename || f.filename || 'file',
            size: parseInt(f.size) || 0,
            dlink: (f.dlink || '').replace(/\\\//g, '/'),
            thumbnail: f.thumbs?.url3 || f.thumbs?.url2 || f.thumbs?.url1 || ''
          }));

        if (files.length > 0) {
          return {
            success: true,
            title: data.title || files[0].filename,
            files,
            thumbnail: files[0].thumbnail
          };
        }
      }

      return { success: false, title: '', files: [], thumbnail: '', error: `share/list errno: ${data.errno}` };
    } catch (e: any) {
      return { success: false, title: '', files: [], thumbnail: '', error: `share/list error: ${e.message}` };
    }
  }

  private parsePageData(html: string): TeraBoxResult {
    const files: TeraBoxFile[] = [];
    let title = '';
    let thumbnail = '';

    // Extract page title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\s*[-–|]?\s*TeraBox.*$/i, '').trim()
                           .replace(/\s*-\s*Share Files.*$/i, '').trim();
    }

    // Try to find file_list in embedded JSON
    const patterns = [
      /"file_list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
      /"list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          let data = match[1];
          data = data.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
          data = data.replace(/\\u002F/g, '/');
          const parsed = JSON.parse(data);
          const fileList = Array.isArray(parsed) ? parsed : [];

          for (const f of fileList) {
            if (f.isdir === 1 || f.isdir === '1') continue;
            files.push({
              filename: f.server_filename || f.filename || f.name || 'file',
              size: parseInt(f.size) || 0,
              dlink: (f.dlink || '').replace(/\\u002F/g, '/').replace(/\\\//g, '/'),
              thumbnail: (f.thumbs?.url3 || f.thumbs?.url2 || f.thumbs?.url1 || f.thumbnail || '').replace(/\\u002F/g, '/')
            });
          }

          if (files.length > 0) {
            thumbnail = files[0].thumbnail;
            break;
          }
        } catch (e) {
          // JSON parse failed, try next
        }
      }
    }

    if (files.length > 0) {
      return { success: true, title: title || files[0].filename, files, thumbnail };
    }

    return { success: false, title, files: [], thumbnail, error: 'No downloadable files found in page data' };
  }

  // HTTP GET with redirect following and cookie accumulation across redirects
  private httpGet(url: string, extraHeaders?: Record<string, string>, maxRedirects = 10, accumulatedCookies = ''): Promise<{ body: string; cookies: string; finalUrl: string }> {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

      const parsedUrl = new URL(url);
      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': this.UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          ...(accumulatedCookies ? { 'Cookie': accumulatedCookies } : {}),
          ...extraHeaders
        }
      };

      const proto = parsedUrl.protocol === 'https:' ? https : http;

      const req = proto.request(options, (res) => {
        // Collect cookies from this response and merge with accumulated
        const setCookies = res.headers['set-cookie'] || [];
        const newCookies = setCookies.map(c => c.split(';')[0]).join('; ');
        const mergedCookies = this.mergeCookies(accumulatedCookies, newCookies);

        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (redirectUrl.startsWith('/')) {
            redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
          } else if (!redirectUrl.startsWith('http')) {
            redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/${redirectUrl}`;
          }
          // Drain the current response
          res.resume();
          // Follow redirect with accumulated cookies
          const mergedHeaders = extraHeaders ? { ...extraHeaders } : {};
          this.httpGet(redirectUrl, mergedHeaders, maxRedirects - 1, mergedCookies).then(resolve).catch(reject);
          return;
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ body, cookies: mergedCookies, finalUrl: url }));
        res.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
      req.end();
    });
  }

  // Merge two cookie strings, newer values overwriting older ones
  private mergeCookies(existing: string, newer: string): string {
    const map = new Map<string, string>();
    for (const str of [existing, newer]) {
      if (!str) continue;
      for (const pair of str.split(';')) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          map.set(trimmed.substring(0, eqIdx).trim(), trimmed.substring(eqIdx + 1).trim());
        }
      }
    }
    return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  // Get M3U8 streaming URL for a TeraBox video (no login required)
  async getM3U8StreamUrl(shareUrl: string): Promise<{ m3u8Content: string; cookies: string; referer: string; ua: string; filename: string; thumbnail: string } | null> {
    try {
      const normalizedUrl = this.normalizeUrl(shareUrl);
      const { fullSurl, strippedSurl } = this.extractSurl(shareUrl, normalizedUrl);
      if (!strippedSurl || !fullSurl) return null;

      // Step 1: Get mobile page → jsToken + cookies
      console.log('[TeraBox M3U8] Step 1: Fetching mobile page...');
      const { body, cookies, finalUrl } = await this.httpGet(`https://www.terabox.com/sharing/link?surl=${strippedSurl}`);
      const jsToken = this.extractJsToken(body);
      console.log('[TeraBox M3U8] HTML:', body.length, 'cookies:', cookies ? 'YES' : 'NO', 'jsToken:', jsToken ? 'YES' : 'NO');

      if (!jsToken || !cookies) {
        console.log('[TeraBox M3U8] Failed to get jsToken or cookies');
        return null;
      }

      // Step 2: shorturlinfo → sign, timestamp, shareid, uk, fs_id
      console.log('[TeraBox M3U8] Step 2: Fetching shorturlinfo...');
      const shortApiUrl = `https://www.terabox.com/api/shorturlinfo?app_id=250528&shorturl=${fullSurl}&jsToken=${encodeURIComponent(jsToken)}&root=1`;
      const { body: shortBody } = await this.httpGet(shortApiUrl, {
        'Cookie': cookies,
        'Referer': finalUrl,
        'Accept': 'application/json, text/plain, */*'
      });

      const info = JSON.parse(shortBody);
      if (info.errno !== 0 || !info.list || info.list.length === 0) {
        console.log('[TeraBox M3U8] shorturlinfo failed, errno:', info.errno);
        return null;
      }

      const shareid = info.shareid;
      const sign = info.sign;
      const timestamp = info.timestamp;
      const uk = info.uk;
      const file = info.list.find((f: any) => f.isdir !== 1 && f.isdir !== '1');
      if (!file) return null;

      const fsId = file.fs_id;
      const filename = file.server_filename || 'video.mp4';
      const thumbnail = file.thumbs?.url3 || file.thumbs?.url2 || file.thumbs?.url1 || '';
      console.log('[TeraBox M3U8] Got params - shareid:', shareid, 'sign:', sign ? 'YES' : 'NO', 'fsId:', fsId);

      // Step 3: /share/streaming → M3U8
      // Try resolutions in order: 480p, 360p
      const types = ['M3U8_AUTO_480', 'M3U8_AUTO_360', 'M3U8_FLV_264_480'];
      for (const type of types) {
        console.log(`[TeraBox M3U8] Step 3: Trying /share/streaming type=${type}...`);
        const streamUrl = `https://www.terabox.com/share/streaming?` +
          `type=${type}&app_id=250528&shorturl=${fullSurl}` +
          `&fid=${fsId}&channel=dubox&clienttype=0` +
          `&uk=${uk}&shareid=${shareid}` +
          `&sign=${encodeURIComponent(sign)}&timestamp=${timestamp}` +
          `&jsToken=${encodeURIComponent(jsToken)}`;

        try {
          const { body: m3u8Body } = await this.httpGet(streamUrl, {
            'Cookie': cookies,
            'Referer': finalUrl,
            'Accept': '*/*'
          });

          if (m3u8Body.startsWith('#EXTM3U')) {
            console.log('[TeraBox M3U8] SUCCESS! Got M3U8 playlist for', type);
            return {
              m3u8Content: m3u8Body,
              cookies,
              referer: finalUrl,
              ua: this.UA,
              filename,
              thumbnail
            };
          }
          console.log('[TeraBox M3U8]', type, 'failed:', m3u8Body.substring(0, 100));
        } catch (e: any) {
          console.log('[TeraBox M3U8]', type, 'error:', e.message);
        }
      }

      console.log('[TeraBox M3U8] All streaming types failed');
      return null;
    } catch (error: any) {
      console.error('[TeraBox M3U8] Error:', error.message);
      return null;
    }
  }

  // Get stream info for a TeraBox URL (dlink + cookies + headers needed for proxy streaming)
  async getStreamInfo(shareUrl: string): Promise<{ dlink: string; cookies: string; referer: string; filename: string; size: number; ua: string } | null> {
    const result = await this.extract(shareUrl);
    if (!result.success || result.files.length === 0) return null;
    
    const file = result.files[0];
    if (!file.dlink) return null;

    // We need the cookies from the share page for the dlink to work
    const normalizedUrl = this.normalizeUrl(shareUrl);
    const { cookies, finalUrl } = await this.httpGet(normalizedUrl);
    
    return {
      dlink: file.dlink,
      cookies,
      referer: finalUrl || normalizedUrl,
      filename: file.filename,
      size: file.size,
      ua: this.UA
    };
  }

  // Download a file via its dlink (proxy through server)
  downloadFile(dlink: string, destPath: string, shareUrl: string, onProgress?: (downloaded: number, total: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const makeRequest = (reqUrl: string, redirectsLeft: number) => {
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));

        const parsed = new URL(reqUrl);
        const opts: https.RequestOptions = {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers: {
            'User-Agent': this.UA,
            'Referer': shareUrl,
            'Accept': '*/*',
          }
        };

        const p = parsed.protocol === 'https:' ? https : http;
        const req = p.request(opts, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let loc = res.headers.location;
            if (loc.startsWith('/')) loc = `${parsed.protocol}//${parsed.hostname}${loc}`;
            res.resume();
            makeRequest(loc, redirectsLeft - 1);
            return;
          }

          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Download failed with status ${res.statusCode}`));
            return;
          }

          const total = parseInt(res.headers['content-length'] || '0', 10);
          let downloaded = 0;

          const fs = require('fs');
          const fileStream = fs.createWriteStream(destPath);
          res.on('data', (chunk: Buffer) => {
            downloaded += chunk.length;
            if (onProgress) onProgress(downloaded, total);
          });
          
          res.pipe(fileStream);
          fileStream.on('finish', () => { fileStream.close(); resolve(); });
          fileStream.on('error', reject);
          res.on('error', reject);
        });

        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Download timeout')); });
        req.end();
      };

      makeRequest(dlink, 10);
    });
  }
}
