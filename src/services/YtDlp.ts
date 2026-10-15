import { spawn as nodeSpawn, ChildProcess, SpawnOptions } from 'child_process';
import { ClassifiedError, classifyError } from '../utils/errors';
import { ErrorCode } from '../types';

export type SpawnFn = (command: string, args: string[], options: SpawnOptions) => ChildProcess;

export interface YtDlpOptions {
  binary: string;
  ffmpegLocation?: string;
  jsRuntimes?: string[];
  cookiesFile?: string;
  spawn?: SpawnFn;
}

const MAX_CAPTURE = 64 * 1024 * 1024;
const isWindows = process.platform === 'win32';

/** Kill a child and, on POSIX, its whole process group (yt-dlp spawns ffmpeg) */
export function killTree(child: ChildProcess, signal: NodeJS.Signals = 'SIGTERM'): void {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (isWindows && child.pid) {
      // The yt-dlp.exe launcher runs the real work in a child process
      nodeSpawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
        .on('error', () => child.kill(signal));
      return;
    }
    if (!isWindows && child.pid) {
      process.kill(-child.pid, signal);
      return;
    }
  } catch {
    // fall through to a plain kill
  }
  try {
    child.kill(signal);
  } catch {
    // already gone
  }
}

/** Thin wrapper around the yt-dlp binary with shared global options */
export class YtDlp {
  private spawnFn: SpawnFn;

  constructor(private opts: YtDlpOptions) {
    this.spawnFn = opts.spawn || nodeSpawn;
  }

  get binary(): string {
    return this.opts.binary;
  }

  baseArgs(): string[] {
    const args = ['--ignore-config', '--color', 'never'];
    if (this.opts.ffmpegLocation) args.push('--ffmpeg-location', this.opts.ffmpegLocation);
    for (const runtime of this.opts.jsRuntimes || []) args.push('--js-runtimes', runtime);
    if (this.opts.cookiesFile) args.push('--cookies', this.opts.cookiesFile);
    return args;
  }

  /** Start a long-running yt-dlp process (used for downloads) */
  spawn(args: string[]): ChildProcess {
    return this.spawnFn(this.opts.binary, [...this.baseArgs(), ...args], {
      windowsHide: true,
      // Own process group on POSIX so cancel can kill ffmpeg children too
      detached: !isWindows,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  /** Run yt-dlp to completion and collect output. Settles exactly once. */
  run(args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let child: ChildProcess;
      try {
        child = this.spawn(args);
      } catch (e) {
        reject(new ClassifiedError(classifyError(e)));
        return;
      }

      let stdout = '';
      let stderr = '';
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };

      const timer = setTimeout(() => {
        killTree(child, 'SIGKILL');
        settle(() => reject(new ClassifiedError({
          code: ErrorCode.NETWORK_ERROR,
          message: `Timed out after ${Math.round(timeoutMs / 1000)}s while contacting the platform`,
          retryable: true
        })));
      }, timeoutMs);

      child.stdout?.on('data', d => {
        if (stdout.length < MAX_CAPTURE) stdout += d.toString();
      });
      child.stderr?.on('data', d => {
        if (stderr.length < MAX_CAPTURE) stderr += d.toString();
      });

      // 'error' (e.g. ENOENT) and 'close' can BOTH fire — settle() guards that
      child.on('error', err => settle(() => reject(new ClassifiedError(classifyError(err)))));
      child.on('close', code => {
        if (code === 0) settle(() => resolve({ stdout, stderr }));
        else settle(() => reject(new ClassifiedError(classifyError(new Error(`yt-dlp exited with code ${code}`), stderr))));
      });
    });
  }

  async version(): Promise<string | null> {
    try {
      const { stdout } = await this.run(['--version'], 15_000);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }
}
