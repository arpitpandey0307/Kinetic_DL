import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createAdapterRegistry } from '../src/adapters';
import { MediaExtractor } from '../src/services/MediaExtractor';
import { DownloadManager } from '../src/services/DownloadManager';
import { ProgressTracker } from '../src/services/ProgressTracker';
import { TeraBoxExtractor } from '../src/services/TeraBoxExtractor';
import { YtDlp } from '../src/services/YtDlp';
import { FakeProcess, fakeSpawner, waitFor } from './helpers';

let server: Server;
let base: string;
let dir: string;
let processes: FakeProcess[];

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kdl-api-'));
  const fake = fakeSpawner();
  processes = fake.processes;
  const config = { ...loadConfig(), downloadDir: dir, rateLimitMaxRequests: 1000, downloadRateLimitMax: 1000, trustProxy: 0 };
  const adapterRegistry = createAdapterRegistry();
  const ytdlp = new YtDlp({ binary: 'yt-dlp', spawn: fake.spawn });
  const progressTracker = new ProgressTracker(0);
  const mediaExtractor = new MediaExtractor(adapterRegistry, ytdlp, 5000, 1);
  const teraBoxExtractor = new TeraBoxExtractor();
  const downloadManager = new DownloadManager({ adapterRegistry, progressTracker, teraBoxExtractor, ytdlp, downloadDir: dir });
  // Public test hosts resolve to a public IP; everything else is unresolvable
  const resolver = async (host: string) => (/youtube\.com$|example\.com$/.test(host) ? ['93.184.216.34'] : []);
  const app = createApp({ config, adapterRegistry, mediaExtractor, downloadManager, progressTracker, teraBoxExtractor, ytdlp, resolver, publicDir: path.resolve('public') });
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const post = (p: string, body: unknown) =>
  fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('analyze returns qualities and hides the raw format list', async () => {
  const pending = post('/api/analyze', { url: YT });
  await waitFor(() => processes.length === 1);
  processes[0].out(JSON.stringify({ title: 'Clip', thumbnail: 'https://i.ytimg.com/x.jpg', duration: 3, formats: [
    { format_id: '137', ext: 'mp4', height: 1080, width: 1920, vcodec: 'avc1', acodec: 'none', filesize: 10 },
    { format_id: '140', ext: 'm4a', vcodec: 'none', acodec: 'mp4a', filesize: 1 }
  ] }));
  processes[0].finish(0);
  const res = await pending;
  const body = await res.json() as any;
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.metadata.title, 'Clip');
  assert.deepEqual(body.data.metadata.formats, []);
  assert.equal(body.data.availableQualities[0].formatId, '137');
});

test('invalid and internal URLs are rejected with 400', async () => {
  for (const url of ['', 'not-a-url', 'file:///etc/passwd', 'http://169.254.169.254/latest', 'http://127.0.0.1:3000/', 'https://unresolvable.invalid/']) {
    const res = await post('/api/analyze', { url });
    assert.equal(res.status, 400, url);
    assert.equal((await res.json() as any).success, false);
  }
  const bad = await post('/api/analyze', '{oops');
  assert.equal(bad.status, 400);
});

test('download validates its input', async () => {
  assert.equal((await post('/api/download', { url: YT })).status, 400, 'needs a format or audioOnly');
  assert.equal((await post('/api/download', { url: YT, formatId: '--exec rm' })).status, 400);
  assert.equal((await post('/api/download', { url: YT, audioOnly: 'yes' })).status, 400);
  assert.equal((await post('/api/download', { url: YT, audioOnly: true, audioFormat: 'wav' })).status, 400);
});

test('full download flow: queue -> SSE progress -> file download -> history', async () => {
  const res = await post('/api/download', { url: YT, formatId: '137' });
  assert.equal(res.status, 202);
  const { sessionId } = await res.json() as any;

  const sse = await fetch(`${base}/api/progress/${sessionId}`);
  assert.equal(sse.headers.get('content-type'), 'text/event-stream');

  await waitFor(() => processes.some(p => p.args.includes('-o') && p.exitCode === null));
  const proc = processes.find(p => p.args.includes('-o') && p.exitCode === null)!;
  proc.out('KDL_PROGRESS|50|100|NA|10|5|downloading');
  const template = proc.args[proc.args.indexOf('-o') + 1];
  const file = path.join(path.dirname(template), 'Clip.mp4');
  fs.writeFileSync(file, 'x'.repeat(1000));
  proc.out(`KDL_FILE|${file}`);
  proc.finish(0);

  const text = await sse.text(); // stream closes after the "complete" event
  assert.match(text, /"type":"complete"/);
  assert.match(text, /"status":"COMPLETED"/);
  assert.doesNotMatch(text, new RegExp(dir.replace(/\\/g, '\\\\\\\\')), 'server paths never leak');

  const dl = await fetch(`${base}/api/download/${sessionId}/file`);
  assert.equal(dl.status, 200);
  assert.match(dl.headers.get('content-disposition') || '', /attachment; filename="Clip.mp4"/);

  const ranged = await fetch(`${base}/api/stream/${sessionId}/file`, { headers: { Range: 'bytes=-100' } });
  assert.equal(ranged.status, 206);
  assert.equal((await ranged.arrayBuffer()).byteLength, 100);
  const unsatisfiable = await fetch(`${base}/api/stream/${sessionId}/file`, { headers: { Range: 'bytes=999999-' } });
  assert.equal(unsatisfiable.status, 416);

  const hist = await (await fetch(`${base}/api/history?ids=${sessionId},11111111-1111-4111-8111-111111111111,junk`)).json() as any;
  assert.deepEqual(hist.records.map((r: any) => r.status), ['COMPLETED', 'EXPIRED']);
  assert.equal(hist.records[0].fileAvailable, true);
});

test('session endpoints never match by prefix or accept bad ids', async () => {
  for (const p of ['/api/stream/a/file', '/api/download/a/file', '/api/progress/a', '/api/sessions/../etc', '/api/stream/11111111-1111-4111-8111-111111111111/file']) {
    const res = await fetch(base + p);
    assert.equal(res.status, 404, p);
  }
});

test('security headers are set and unknown API routes 404', async () => {
  const res = await fetch(`${base}/dashboard.html`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-security-policy'));
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
});
