import dns from 'dns';
import net from 'net';

// Address ranges the server must never be tricked into fetching (SSRF):
// loopback, private LANs, link-local (cloud metadata 169.254.169.254), CGNAT,
// multicast, reserved and their IPv6 equivalents.
const blockList = new net.BlockList();
for (const [addr, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4]
] as const) {
  blockList.addSubnet(addr, prefix, 'ipv4');
}
for (const [addr, prefix] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
  ['2001:db8::', 32], ['64:ff9b::', 96]
] as const) {
  blockList.addSubnet(addr, prefix, 'ipv6');
}

export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 0) return true;
  if (family === 6) {
    // IPv4-mapped IPv6 (::ffff:127.0.0.1) must be checked as IPv4
    const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return blockList.check(mapped[1], 'ipv4');
    return blockList.check(address, 'ipv6');
  }
  return blockList.check(address, 'ipv4');
}

export type Resolver = (hostname: string) => Promise<string[]>;

const defaultResolver: Resolver = async hostname => {
  const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return records.map(r => r.address);
};

export interface UrlCheckResult {
  ok: boolean;
  reason?: string;
}

/**
 * Ensure a user-supplied URL points at a public internet host. Resolves the
 * hostname and rejects it if ANY of its addresses is private/internal.
 */
export async function assertPublicUrl(
  url: string,
  opts: { allowPrivate?: boolean; resolver?: Resolver } = {}
): Promise<UrlCheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'Malformed URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs are allowed' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed' };
  }
  if (opts.allowPrivate) return { ok: true };

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { ok: false, reason: 'Internal hosts are not allowed' };
  }

  let addresses: string[];
  if (net.isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      addresses = await (opts.resolver || defaultResolver)(hostname);
    } catch {
      return { ok: false, reason: 'Could not resolve host' };
    }
  }

  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    return { ok: false, reason: 'Internal or private network addresses are not allowed' };
  }
  return { ok: true };
}
