import { Request, Response, NextFunction, RequestHandler } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, per-client-IP rate limiter. In-memory, which is fine for the
 * single-instance deployments this app targets.
 */
export function rateLimit(opts: { windowMs: number; max: number; name?: string }): RequestHandler & { reset(): void } {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.min(opts.windowMs, 60_000));
  sweep.unref();

  const middleware = ((req: Request, res: Response, next: NextFunction) => {
    if (opts.max <= 0) return next();

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count++;

    const remaining = Math.max(0, opts.max - bucket.count);
    res.setHeader('RateLimit-Limit', String(opts.max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many ${opts.name || 'requests'}. Try again in ${Math.ceil((bucket.resetAt - now) / 1000)}s.`,
          retryable: true
        }
      });
    }
    next();
  }) as RequestHandler & { reset(): void };

  middleware.reset = () => buckets.clear();
  return middleware;
}
