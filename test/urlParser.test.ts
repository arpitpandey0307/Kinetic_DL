import { test } from 'node:test';
import assert from 'node:assert/strict';
import { URLParser } from '../src/utils/URLParser';
import { Platform } from '../src/types';

const parser = new URLParser();

test('recognises each supported platform and extracts the id', () => {
  const cases: [string, Platform, string][] = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', Platform.YOUTUBE, 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ', Platform.YOUTUBE, 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', Platform.YOUTUBE, 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', Platform.YOUTUBE, 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/embed/dQw4w9WgXcQ', Platform.YOUTUBE, 'dQw4w9WgXcQ'],
    ['https://www.instagram.com/reel/Cabc_123/', Platform.INSTAGRAM, 'Cabc_123'],
    ['https://www.tiktok.com/@user/video/7234567890123456789', Platform.TIKTOK, '7234567890123456789'],
    ['https://vm.tiktok.com/ZMabc123/', Platform.TIKTOK, 'ZMabc123'],
    ['https://www.terabox.com/s/1OB7ngRLALsH8y2e', Platform.TERABOX, '1OB7ngRLALsH8y2e'],
    ['https://1024terabox.com/s/1abc', Platform.TERABOX, '1abc'],
    ['https://www.reddit.com/r/videos/comments/abc123/title/', Platform.REDDIT, 'abc123'],
    ['https://www.pinterest.com/pin/123456/', Platform.PINTEREST, '123456'],
    ['https://x.com/user/status/1234567890', Platform.TWITTER, '1234567890'],
    ['https://twitter.com/user/status/1234567890', Platform.TWITTER, '1234567890'],
    ['https://www.facebook.com/page/videos/987654321/', Platform.FACEBOOK, '987654321'],
    ['https://fb.watch/abcDEF/', Platform.FACEBOOK, 'abcDEF'],
    ['https://vimeo.com/76979871', Platform.VIMEO, '76979871'],
    ['https://player.vimeo.com/video/76979871', Platform.VIMEO, '76979871']
  ];
  for (const [url, platform, id] of cases) {
    const r = parser.parse(url);
    assert.equal(r.isValid, true, url);
    assert.equal(r.platform, platform, url);
    assert.equal(r.videoId, id, url);
  }
});

test('falls back to the generic platform for other http(s) URLs', () => {
  const r = parser.parse('https://example.com/videos/clip.mp4');
  assert.equal(r.isValid, true);
  assert.equal(r.platform, Platform.GENERIC);
});

test('matches on hostname, not on text elsewhere in the URL', () => {
  assert.equal(parser.parse('https://evil.example/?u=youtube.com/watch?v=dQw4w9WgXcQ').platform, Platform.GENERIC);
  assert.equal(parser.parse('https://notyoutube.com/watch?v=dQw4w9WgXcQ').platform, Platform.GENERIC);
});

test('rejects invalid input with a consistent shape', () => {
  const bad = ['', 'not a url', 'ftp://example.com/a', 'file:///etc/passwd', 'javascript:alert(1)', 'https://a.com/' + 'x'.repeat(3000)];
  for (const url of bad) {
    const r = parser.parse(url);
    assert.equal(r.isValid, false, url);
    assert.equal(r.platform, null);
    assert.equal(r.videoId, null);
    assert.ok(r.error);
  }
  assert.equal(parser.parse(undefined as any).isValid, false);
});
