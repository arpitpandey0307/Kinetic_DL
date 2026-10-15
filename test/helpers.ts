import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { ChildProcess } from 'child_process';

/** A controllable stand-in for a spawned yt-dlp process */
export class FakeProcess extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  pid = undefined;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  killed = false;

  constructor(public args: string[]) {
    super();
  }

  kill(): boolean {
    this.killed = true;
    this.finish(null);
    return true;
  }

  out(line: string) {
    this.stdout.write(line + '\n');
  }

  err(line: string) {
    this.stderr.write(line + '\n');
  }

  finish(code: number | null) {
    if (this.exitCode !== null || this.signalCode !== null) return;
    this.exitCode = code;
    if (code === null) this.signalCode = 'SIGTERM';
    this.stdout.end();
    this.stderr.end();
    setImmediate(() => this.emit('close', code));
  }
}

export function fakeSpawner() {
  const processes: FakeProcess[] = [];
  const spawn = ((_cmd: string, args: string[]) => {
    const p = new FakeProcess(args);
    processes.push(p);
    return p as unknown as ChildProcess;
  }) as any;
  return { spawn, processes };
}

export const tick = (ms = 10) => new Promise(r => setTimeout(r, ms));

export async function waitFor(cond: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await tick(5);
  }
}
