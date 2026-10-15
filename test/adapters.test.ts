import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdapterRegistry, YouTubeAdapter } from '../src/adapters';

const registry = createAdapterRegistry();

test('every adapter implements the interface', () => {
  for (const adapter of registry.getAllAdapters()) {
    assert.equal(typeof adapter.name, 'string');
    assert.ok(adapter.hostPattern instanceof RegExp);
    assert.ok(adapter.urlPattern instanceof RegExp);
    for (const fn of ['matches', 'extractVideoId', 'getYtDlpArgs', 'parseMetadata'] as const) {
      assert.equal(typeof adapter[fn], 'function', `${adapter.name}.${fn}`);
    }
  }
});

test('URL is always passed after "--" as the final argument', () => {
  for (const adapter of registry.getAllAdapters()) {
    for (const opts of [{ audioOnly: true }, { formatId: '137' }, {}]) {
      const args = adapter.getYtDlpArgs('https://example.com/v', opts);
      assert.equal(args[args.length - 2], '--');
      assert.equal(args[args.length - 1], 'https://example.com/v');
    }
  }
});

test('audio extraction: MP3 at 320K with metadata, FLAC lossless', () => {
  const a = new YouTubeAdapter();
  const mp3 = a.getYtDlpArgs('https://youtu.be/x', { audioOnly: true, audioFormat: 'mp3' });
  assert.equal(mp3[mp3.indexOf('--audio-format') + 1], 'mp3');
  assert.equal(mp3[mp3.indexOf('--audio-quality') + 1], '320K');
  assert.ok(mp3.includes('-x'));
  assert.ok(mp3.includes('--embed-metadata'));
  assert.ok(mp3.includes('--embed-thumbnail'));

  const flac = a.getYtDlpArgs('https://youtu.be/x', { audioOnly: true, audioFormat: 'flac' });
  assert.equal(flac[flac.indexOf('--audio-format') + 1], 'flac');
  assert.equal(flac[flac.indexOf('--audio-quality') + 1], '0');
});

test('video format selection merges audio only when needed', () => {
  const a = new YouTubeAdapter();
  const videoOnly = a.getYtDlpArgs('u', { formatId: '137' });
  assert.match(videoOnly[videoOnly.indexOf('-f') + 1], /^137\+bestaudio/);
  const combined = a.getYtDlpArgs('u', { formatId: '18', formatHasAudio: true });
  assert.equal(combined[combined.indexOf('-f') + 1], '18/best');
  assert.ok(videoOnly.includes('--merge-output-format'));
});

test('parseMetadata maps yt-dlp JSON and drops storyboards', () => {
  const meta = new YouTubeAdapter().parseMetadata({
    title: 'T', thumbnail: 'th', duration: 12, uploader: 'U',
    formats: [
      { format_id: '137', ext: 'mp4', height: 1080, width: 1920, vcodec: 'avc1.640028', acodec: 'none', filesize: 100 },
      { format_id: '140', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2', filesize_approx: 10 },
      { format_id: 'sb0', ext: 'mhtml', vcodec: 'none', acodec: 'none' }
    ]
  });
  assert.equal(meta.title, 'T');
  assert.equal(meta.author, 'U');
  assert.deepEqual(meta.formats.map(f => f.formatId), ['137', '140']);
  assert.equal(meta.formats[1].filesize, 10);
});
