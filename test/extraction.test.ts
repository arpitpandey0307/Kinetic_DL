import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractQualityOptions, getQualityLabel, MediaExtractor } from '../src/services/MediaExtractor';
import { classifyError, withRetry, ClassifiedError } from '../src/utils/errors';
import { createAdapterRegistry } from '../src/adapters';
import { YtDlp } from '../src/services/YtDlp';
import { ErrorCode, MediaMetadata } from '../src/types';
import { fakeSpawner, waitFor } from './helpers';

const meta = (formats: any[]): MediaMetadata => ({ title: 't', thumbnail: '', duration: 1, formats });

test('one option per resolution, highest first, H.264 preferred', () => {
  const options = extractQualityOptions(meta([
    { formatId: '248', resolution: '1080p', height: 1080, width: 1920, vcodec: 'vp9', acodec: 'none', codec: 'vp9', container: 'webm', filesize: 900 },
    { formatId: '137', resolution: '1080p', height: 1080, width: 1920, vcodec: 'avc1.640028', acodec: 'none', codec: 'avc1', container: 'mp4', filesize: 800 },
    { formatId: '136', resolution: '720p', height: 720, width: 1280, vcodec: 'avc1.4d401f', acodec: 'none', codec: 'avc1', container: 'mp4', filesize: 400 },
    { formatId: '140', resolution: 'audio', vcodec: 'none', acodec: 'mp4a.40.2', codec: 'mp4a', container: 'm4a', filesize: 50 }
  ]));
  assert.deepEqual(options.map(o => o.formatId), ['137', '136']);
  assert.equal(options[0].label, '1080P_HD');
  assert.equal(options[0].hasAudio, false);
  assert.equal(options[0].filesize, 850, 'video-only size includes best audio');
});

test('vertical video is labelled by its short side', () => {
  const [opt] = extractQualityOptions(meta([
    { formatId: 'v', resolution: '1920p', height: 1920, width: 1080, vcodec: 'h264', acodec: 'aac', codec: 'h264', container: 'mp4', filesize: 1 }
  ]));
  assert.equal(opt.label, '1080P_HD');
  assert.equal(opt.hasAudio, true);
});

test('quality labels', () => {
  assert.equal(getQualityLabel(2160), '4K_ULTRA');
  assert.equal(getQualityLabel(1440), '2K_QHD');
  assert.equal(getQualityLabel(720), '720P_HD');
  assert.equal(getQualityLabel(480), '480P_SD');
  assert.equal(getQualityLabel(240), '240P');
  assert.equal(getQualityLabel(144), '144P');
});

test('error classification maps yt-dlp messages to codes', () => {
  const c = (msg: string) => classifyError(new Error('exit 1'), `ERROR: [youtube] abc: ${msg}`).code;
  assert.equal(c('Private video. Sign in if you have been granted access'), ErrorCode.ACCESS_DENIED);
  assert.equal(c('Sign in to confirm you’re not a bot'), ErrorCode.ACCESS_DENIED);
  assert.equal(c('This video is unavailable'), ErrorCode.VIDEO_NOT_FOUND);
  assert.equal(c('HTTP Error 404: Not Found'), ErrorCode.VIDEO_NOT_FOUND);
  assert.equal(c('HTTP Error 429: Too Many Requests'), ErrorCode.PLATFORM_UNAVAILABLE);
  assert.equal(c('Unable to download webpage: timed out'), ErrorCode.NETWORK_ERROR);
  assert.equal(c('Unsupported URL: https://x'), ErrorCode.INVALID_URL);
  assert.equal(c('Requested format is not available'), ErrorCode.FORMAT_UNAVAILABLE);
  const enoent = Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' });
  assert.equal(classifyError(enoent).code, ErrorCode.DEPENDENCY_MISSING);
  for (const code of Object.values(ErrorCode)) assert.equal(typeof code, 'string');
});

test('withRetry backs off on transient errors only', async () => {
  let calls = 0;
  const transient = new ClassifiedError({ code: ErrorCode.NETWORK_ERROR, message: 'x', retryable: true });
  const result = await withRetry(async () => {
    if (++calls < 3) throw transient;
    return 'ok';
  }, { retries: 2, baseDelayMs: 1 });
  assert.equal(result, 'ok');
  assert.equal(calls, 3);

  calls = 0;
  const permanent = new ClassifiedError({ code: ErrorCode.ACCESS_DENIED, message: 'x', retryable: false });
  await assert.rejects(withRetry(async () => {
    calls++;
    throw permanent;
  }, { retries: 2, baseDelayMs: 1 }));
  assert.equal(calls, 1);
});

test('MediaExtractor caches results and shares concurrent requests', async () => {
  const { spawn, processes } = fakeSpawner();
  const extractor = new MediaExtractor(createAdapterRegistry(), new YtDlp({ binary: 'yt-dlp', spawn }), 5000, 1);
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const a = extractor.analyze(url);
  const b = extractor.analyze(url);
  await waitFor(() => processes.length === 1);
  processes[0].out(JSON.stringify({ title: 'Clip', formats: [{ format_id: '18', ext: 'mp4', height: 360, width: 640, vcodec: 'avc1', acodec: 'mp4a' }] }));
  processes[0].finish(0);
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(ra.success, true);
  assert.equal(rb, ra);
  assert.equal(ra.metadata.title, 'Clip');
  assert.ok(extractor.getCachedFormat(url, '18'));
  await extractor.analyze(url);
  assert.equal(processes.length, 1, 'served from cache');
});

test('MediaExtractor reports a missing yt-dlp binary', async () => {
  const extractor = new MediaExtractor(createAdapterRegistry(), new YtDlp({ binary: 'definitely-not-installed-ytdlp' }), 5000, 1);
  const result = await extractor.analyze('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(result.success, false);
  assert.equal(result.error?.code, ErrorCode.DEPENDENCY_MISSING);
});
