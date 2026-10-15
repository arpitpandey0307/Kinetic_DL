import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { AddressInfo } from 'net';
import { rateLimit } from '../src/utils/rateLimit';

test('rate limiter returns 429 after the limit and sets headers', async () => {
  const app = express();
  app.use(rateLimit({ windowMs: 60_000, max: 2 }));
  app.get('/', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  try {
    assert.equal((await fetch(url)).status, 200);
    const second = await fetch(url);
    assert.equal(second.status, 200);
    assert.equal(second.headers.get('ratelimit-remaining'), '0');
    const third = await fetch(url);
    assert.equal(third.status, 429);
    assert.ok(third.headers.get('retry-after'));
    assert.equal((await third.json() as any).error.code, 'RATE_LIMITED');
  } finally {
    server.close();
  }
});
