import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicUrl, isBlockedAddress } from '../src/utils/urlSafety';

test('private, loopback, link-local and reserved addresses are blocked', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1']) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '142.250.72.14', '2606:4700:4700::1111']) {
    assert.equal(isBlockedAddress(ip), false, ip);
  }
});

test('assertPublicUrl resolves hosts and rejects internal targets', async () => {
  const resolver = async (host: string) => ({ 'public.test': ['93.184.216.34'], 'rebind.test': ['93.184.216.34', '10.0.0.5'] } as Record<string, string[]>)[host] || [];
  assert.equal((await assertPublicUrl('https://public.test/v', { resolver })).ok, true);
  assert.equal((await assertPublicUrl('https://rebind.test/v', { resolver })).ok, false, 'any private address fails');
  assert.equal((await assertPublicUrl('http://127.0.0.1:3000/', { resolver })).ok, false);
  assert.equal((await assertPublicUrl('http://[::1]/', { resolver })).ok, false);
  assert.equal((await assertPublicUrl('http://localhost/', { resolver })).ok, false);
  assert.equal((await assertPublicUrl('https://user:pw@public.test/', { resolver })).ok, false);
  assert.equal((await assertPublicUrl('ftp://public.test/', { resolver })).ok, false);
  assert.equal((await assertPublicUrl('https://unknown.test/', { resolver })).ok, false);
  assert.equal((await assertPublicUrl('http://127.0.0.1/', { allowPrivate: true })).ok, true);
});
