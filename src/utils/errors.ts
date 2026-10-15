import { ErrorCode, ExtractorError } from '../types';

/** Error carrying a classified ExtractorError payload */
export class ClassifiedError extends Error {
  constructor(public readonly info: ExtractorError) {
    super(info.message);
    this.name = 'ClassifiedError';
  }
}

/** Pull the most relevant "ERROR:" line out of yt-dlp's stderr */
export function extractErrorDetail(text: string): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const errorLine = [...lines].reverse().find(l => l.startsWith('ERROR:')) || lines[lines.length - 1] || '';
  return errorLine
    .replace(/^ERROR:\s*/, '')
    .replace(/^\[[^\]]+\]\s*[\w-]+:\s*/, '')
    .slice(0, 300);
}

/** Map yt-dlp / network / process errors onto user-facing error codes */
export function classifyError(error: unknown, stderr = ''): ExtractorError {
  if (error instanceof ClassifiedError) return error.info;

  const err = error as NodeJS.ErrnoException | undefined;
  const raw = `${err?.message || ''}\n${stderr}`;
  const message = raw.toLowerCase();
  const details = extractErrorDetail(stderr || err?.message || '') || undefined;

  if (err?.code === 'ENOENT' || /ffmpeg (is )?not (found|installed)|ffprobe and ffmpeg not found/.test(message)) {
    return {
      code: ErrorCode.DEPENDENCY_MISSING,
      message: 'Server is missing yt-dlp or ffmpeg. Contact the administrator.',
      retryable: false,
      details
    };
  }

  if (/larger than max-filesize|file is larger than/.test(message)) {
    return { code: ErrorCode.FILE_TOO_LARGE, message: 'File exceeds the server size limit', retryable: false, details };
  }

  if (/requested format is not available|format is not available/.test(message)) {
    return {
      code: ErrorCode.FORMAT_UNAVAILABLE,
      message: 'That format is not available for this video. Extract again and pick another quality.',
      retryable: false,
      details
    };
  }

  if (/unsupported url|is not a valid url|no video formats found|no video could be found/.test(message)) {
    return { code: ErrorCode.INVALID_URL, message: 'No downloadable video found at this URL', retryable: false, details };
  }

  if (/sign in to confirm|not a bot|login required|log in|cookies|private|members-only|age-restricted|confirm your age|restricted|forbidden|http error 403|\b401\b/.test(message)) {
    return {
      code: ErrorCode.ACCESS_DENIED,
      message: 'Access denied: video is private, age-restricted, or the platform blocked the server',
      retryable: false,
      details
    };
  }

  if (/http error 404|not found|has been removed|been deleted|video (is )?unavailable|video unavailable|no longer available|does not exist/.test(message)) {
    return { code: ErrorCode.VIDEO_NOT_FOUND, message: 'Video not found: content no longer available', retryable: false, details };
  }

  if (/http error 429|too many requests|rate.?limit|http error 5\d\d|service unavailable|temporarily unavailable/.test(message)) {
    return { code: ErrorCode.PLATFORM_UNAVAILABLE, message: 'Platform unavailable or rate-limited: try again later', retryable: true, details };
  }

  if (/timed? ?out|timeout|econnrefused|econnreset|etimedout|enotfound|eai_again|getaddrinfo|network is unreachable|connection (reset|refused|aborted)|unable to download|ssl/.test(message)) {
    return { code: ErrorCode.NETWORK_ERROR, message: 'Network error: check the link and retry', retryable: true, details };
  }

  return { code: ErrorCode.UNKNOWN_ERROR, message: details || 'Unknown error occurred', retryable: true, details };
}

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Retry an async operation with exponential backoff on retryable errors */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; isRetryable?: (e: unknown) => boolean } = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  // Only transient failures are worth retrying automatically
  const isRetryable = opts.isRetryable ?? ((e: unknown) => {
    const code = classifyError(e).code;
    return code === ErrorCode.NETWORK_ERROR || code === ErrorCode.PLATFORM_UNAVAILABLE;
  });

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastError = e;
      if (attempt === retries || !isRetryable(e)) break;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
