import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DownloadManager, PartAggregator, parseYtDlpLine, QueueFullError } from '../src/services/DownloadManager';
import { ProgressTracker } from '../src/services/ProgressTracker';
import { TeraBoxExtractor } from '../src/services/TeraBoxExtractor';
import { YtDlp } from '../src/services/YtDlp';
import { createAdapterRegistry } from '../src/adapters';
import { DownloadStatus, ErrorCode } from '../src/types';
import { FakeProcess, fakeSpawner, waitFor } from './helpers';

let dir: string;
let processes: FakeProcess[];
let tracker: ProgressTracker;

function manager(extra: Partial<ConstructorParameters<typeof DownloadManager>[0]> = {}) {
  const fake = fakeSpawner();
  processes = fake.processes;
  tracker = new ProgressTracker(0);
  return new DownloadManager({
    adapterRegistry: createAdapterRegistry(),
    progressTracker: tracker,
    teraBoxExtractor: new TeraBoxExtractor(),
    ytdlp: new YtDlp({ binary: 'yt-dlp', spawn: fake.spawn }),
    downloadDir: dir,
    maxConcurrent: 2,
    maxQueueLength: 3,
    ...extra
  });
}

/** Simulate yt-dlp finishing successfully, writing a real file */
function complete(p: FakeProcess, name = 'Video.mp4') {
  const template = p.args[p.args.indexOf('-o') + 1];
  const file = path.join(path.dirname(template), name);
  fs.writeFileSync(file, 'data');
  p.out(`KDL_FILE|${file}`);
  p.finish(0);
}

const req = { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', formatId: '18', audioOnly: false };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kdl-test-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

test('parses structured progress and file lines', () => {
  assert.deepEqual(parseYtDlpLine('KDL_PROGRESS|500|1000|NA|250.5|2|downloading'), {
    type: 'progress', downloaded: 500, total: 1000, speed: 250.5, eta: 2, status: 'downloading'
  });
  assert.equal(parseYtDlpLine('KDL_PROGRESS|10|NA|2000|NA|NA|downloading')!.total, 2000, 'falls back to estimate');
  assert.deepEqual(parseYtDlpLine('KDL_FILE|/tmp/x/a b.mp4'), { type: 'file', path: '/tmp/x/a b.mp4' });
  assert.equal(parseYtDlpLine('[youtube] Extracting URL'), null);
});

test('multi-part progress is monotonic and capped below 100 until done', () => {
  const agg = new PartAggregator(2);
  const seen: number[] = [];
  for (const [d, t] of [[0, 100], [50, 100], [100, 100], [0, 20], [10, 20], [20, 20]]) seen.push(agg.update(d, t).percent);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1], `non-decreasing: ${seen}`);
  assert.equal(seen[2], 50);
  assert.ok(seen[seen.length - 1] <= 99);
});

test('progress tracker never goes backwards and freezes on completion', () => {
  const t = new ProgressTracker(0);
  const updates: number[] = [];
  t.init('s');
  t.subscribe('s', p => updates.push(p.percent));
  t.updateProgress('s', { status: DownloadStatus.DOWNLOADING, percent: 40 });
  t.updateProgress('s', { percent: 20 });
  t.updateProgress('s', { status: DownloadStatus.COMPLETED });
  t.updateProgress('s', { status: DownloadStatus.FAILED, percent: 5 });
  assert.deepEqual(updates, [0, 40, 40, 100]);
  assert.equal(t.getProgress('s')!.status, DownloadStatus.COMPLETED);
});

test('runs at most maxConcurrent downloads and drains the queue without hanging', async () => {
  const dm = manager();
  const sessions = [1, 2, 3, 4].map(() => dm.startDownload(req));
  await waitFor(() => processes.length === 2);
  assert.deepEqual(dm.getStats(), { active: 2, queued: 2, sessions: 4 });
  assert.equal(dm.getSession(sessions[2].sessionId)!.status, DownloadStatus.QUEUED);

  complete(processes[0]);
  await waitFor(() => processes.length === 3);
  complete(processes[1]);
  await waitFor(() => processes.length === 4);
  assert.equal(dm.getStats().active, 2);

  complete(processes[2]);
  complete(processes[3]);
  await waitFor(() => dm.getStats().active === 0);
  for (const s of sessions) {
    const state = dm.getSession(s.sessionId)!;
    assert.equal(state.status, DownloadStatus.COMPLETED, 'queued sessions keep their id');
    assert.equal(state.fileAvailable, true);
    assert.equal(state.progress.filename, 'Video.mp4');
  }
});

test('rejects new work when the queue is full', () => {
  const dm = manager({ maxConcurrent: 1, maxQueueLength: 1 });
  dm.startDownload(req);
  dm.startDownload(req);
  assert.throws(() => dm.startDownload(req), QueueFullError);
  dm.shutdown();
});

test('cancel works for queued and running downloads and cleans up files', async () => {
  const dm = manager({ maxConcurrent: 1 });
  const running = dm.startDownload(req);
  const queued = dm.startDownload(req);
  await waitFor(() => processes.length === 1);

  assert.equal(await dm.cancelDownload(queued.sessionId), true);
  assert.equal(dm.getSession(queued.sessionId)!.status, DownloadStatus.CANCELLED);

  processes[0].out('KDL_PROGRESS|10|100|NA|5|18|downloading');
  assert.equal(await dm.cancelDownload(running.sessionId), true);
  await waitFor(() => dm.getSession(running.sessionId)!.status === DownloadStatus.CANCELLED);
  assert.equal(processes[0].killed, true);
  assert.equal(fs.existsSync(path.join(dir, running.sessionId)), false);
  assert.equal(processes.length, 1, 'cancelled queued item never starts');
});

test('failures are classified and reported to subscribers', async () => {
  const dm = manager();
  const s = dm.startDownload(req);
  const events: string[] = [];
  tracker.subscribe(s.sessionId, p => events.push(p.status));
  await waitFor(() => processes.length === 1);
  processes[0].err('ERROR: [youtube] dQw4w9WgXcQ: Private video. Sign in if you have been granted access');
  processes[0].finish(1);
  await waitFor(() => dm.getSession(s.sessionId)!.status === DownloadStatus.FAILED);
  assert.equal(dm.getSession(s.sessionId)!.error!.code, ErrorCode.ACCESS_DENIED);
  assert.equal(events[events.length - 1], DownloadStatus.FAILED);
  assert.equal(dm.getFilePath(s.sessionId), null);
});

test('yt-dlp args: output in the session folder, size cap, url last', async () => {
  const dm = manager({ maxFileSize: 1000 });
  const s = dm.startDownload({ ...req, audioOnly: true, audioFormat: 'flac' });
  await waitFor(() => processes.length === 1);
  const args = processes[0].args;
  assert.ok(args[args.indexOf('-o') + 1].startsWith(path.join(dir, s.sessionId) + path.sep));
  assert.equal(args[args.indexOf('--max-filesize') + 1], '1000');
  assert.equal(args[args.indexOf('--audio-format') + 1], 'flac');
  assert.equal(args[args.length - 2], '--');
  assert.equal(args[args.length - 1], req.url);
});

test('expired sessions and orphaned folders are removed from disk', async () => {
  const dm = manager({ fileTtlMs: 1000 });
  const s = dm.startDownload(req);
  await waitFor(() => processes.length === 1);
  complete(processes[0]);
  await waitFor(() => dm.getSession(s.sessionId)?.status === DownloadStatus.COMPLETED);
  const filePath = dm.getFilePath(s.sessionId)!;
  assert.ok(fs.existsSync(filePath));

  assert.equal(dm.cleanupSessions(Date.now() + 5000), 1);
  assert.equal(dm.getSession(s.sessionId), undefined);
  assert.equal(fs.existsSync(filePath), false);

  const orphan = path.join(dir, '11111111-1111-4111-8111-111111111111');
  fs.mkdirSync(orphan);
  fs.mkdirSync(path.join(dir, 'not-a-session'));
  assert.equal(dm.purgeOrphans(), 1);
  assert.equal(fs.existsSync(orphan), false);
  assert.equal(fs.existsSync(path.join(dir, 'not-a-session')), true, 'unrelated folders are left alone');
});
