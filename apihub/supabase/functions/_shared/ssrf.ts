// Pure, dependency-free request-safety helpers.
//
// This file is the single source of truth for outbound-request validation. It is
// used by the Supabase edge function (supabase/functions/secure-proxy) AND by the
// browser (src/lib/urlSafety.ts re-exports it) so both sides agree on the rules.
// It deliberately uses no Deno, Node or DOM-only APIs so it can be unit-tested
// with `node --test`.

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

export const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof ALLOWED_METHODS)[number];

export const ALLOWED_PORTS = new Set(["", "80", "443"]);
export const MAX_URL_LENGTH = 2048;
export const MAX_HEADER_COUNT = 30;
export const MAX_HEADER_VALUE_LENGTH = 4096;
export const MAX_BODY_BYTES = 256 * 1024;

const BLOCKED_HOST_SUFFIXES = [
  ".localhost", ".local", ".internal", ".localdomain", ".lan", ".home", ".corp", ".intranet", ".private",
];
const BLOCKED_HOSTNAMES = new Set([
  "localhost", "metadata", "metadata.google.internal", "instance-data", "kubernetes.default", "kubernetes.default.svc",
]);

// ---------------------------------------------------------------- IPv4

export function parseIPv4(input: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(input);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n >= 0 && n <= 255) ? parts : null;
}

/** CIDR blocks that must never be reachable from a user-driven request. */
const BLOCKED_V4: Array<[number[], number]> = [
  [[0, 0, 0, 0], 8],          // "this" network
  [[10, 0, 0, 0], 8],         // private
  [[100, 64, 0, 0], 10],      // carrier-grade NAT
  [[127, 0, 0, 0], 8],        // loopback
  [[169, 254, 0, 0], 16],     // link-local (incl. cloud metadata 169.254.169.254)
  [[172, 16, 0, 0], 12],      // private
  [[192, 0, 0, 0], 24],       // IETF protocol assignments
  [[192, 0, 2, 0], 24],       // TEST-NET-1
  [[192, 88, 99, 0], 24],     // 6to4 relay (deprecated)
  [[192, 168, 0, 0], 16],     // private
  [[198, 18, 0, 0], 15],      // benchmarking
  [[198, 51, 100, 0], 24],    // TEST-NET-2
  [[203, 0, 113, 0], 24],     // TEST-NET-3
  [[224, 0, 0, 0], 4],        // multicast
  [[240, 0, 0, 0], 4],        // reserved + broadcast
];

const v4ToInt = (p: number[]) => (((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]) >>> 0;

export function isBlockedIPv4(ip: string): boolean {
  const parts = parseIPv4(ip);
  if (!parts) return true; // unparseable → fail closed
  const n = v4ToInt(parts);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) >>> 0 === (v4ToInt(base) & mask) >>> 0;
  });
}

// ---------------------------------------------------------------- IPv6

/** Expand an IPv6 literal (no brackets, no zone id) into 8 16-bit groups, or null. */
export function parseIPv6(input: string): number[] | null {
  let s = input.toLowerCase();
  if (s.includes("%")) return null;
  // Trailing embedded IPv4 (::ffff:1.2.3.4)
  const lastColon = s.lastIndexOf(":");
  if (lastColon !== -1 && s.slice(lastColon + 1).includes(".")) {
    const v4 = parseIPv4(s.slice(lastColon + 1));
    if (!v4) return null;
    s = s.slice(0, lastColon + 1) + ((v4[0] << 8) | v4[1]).toString(16) + ":" + ((v4[2] << 8) | v4[3]).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const toGroups = (h: string) => (h === "" ? [] : h.split(":"));
  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];
  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && head.length + tail.length > 7) return null;
  const fill = halves.length === 2 ? new Array(8 - head.length - tail.length).fill("0") : [];
  const groups = [...head, ...fill, ...tail];
  if (groups.length !== 8) return null;
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out;
}

export function isBlockedIPv6(ip: string): boolean {
  const g = parseIPv6(ip);
  if (!g) return true; // fail closed
  const embeddedV4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  const allZeroUpTo = (n: number) => g.slice(0, n).every((x) => x === 0);

  if (g.every((x) => x === 0)) return true;                       // ::  unspecified
  if (allZeroUpTo(7) && g[7] === 1) return true;                   // ::1 loopback
  if (allZeroUpTo(5) && g[5] === 0xffff) return isBlockedIPv4(embeddedV4(g[6], g[7])); // ::ffff:a.b.c.d (IPv4-mapped)
  if (allZeroUpTo(5) && g[5] === 0) return true;                   // ::a.b.c.d (deprecated IPv4-compatible)
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isBlockedIPv4(embeddedV4(g[6], g[7])); // 64:ff9b::/96 NAT64
  if (g[0] === 0x64 && g[1] === 0xff9b) return true;               // 64:ff9b:1::/48 local-use NAT64
  if (g[0] === 0x2002) return isBlockedIPv4(embeddedV4(g[1], g[2])); // 6to4 embeds an IPv4
  if (g[0] === 0x2001 && g[1] === 0) return true;                  // Teredo
  if (g[0] === 0x2001 && g[1] === 0xdb8) return true;              // documentation
  if ((g[0] & 0xfe00) === 0xfc00) return true;                     // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true;                     // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true;                     // fec0::/10 site-local (deprecated)
  if ((g[0] & 0xff00) === 0xff00) return true;                     // multicast
  return false;
}

/** True when `ip` (v4 or v6 literal, no brackets) must be refused. */
export function isBlockedIp(ip: string): boolean {
  return ip.includes(":") ? isBlockedIPv6(ip) : isBlockedIPv4(ip);
}

// ---------------------------------------------------------------- URL validation

/**
 * Validate a user-supplied target URL *before* any network activity.
 * Hostnames that pass here must still have their DNS answers checked with
 * `isBlockedIp` by the caller (see secure-proxy).
 */
export function validateTargetUrl(raw: string, opts: { allowHttp?: boolean } = {}): UrlCheck {
  const allowHttp = opts.allowHttp ?? true;
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, reason: "URL is required." };
  if (raw.length > MAX_URL_LENGTH) return { ok: false, reason: "URL is too long." };
  if (/[\u0000-\u001f\u007f]/.test(raw)) return { ok: false, reason: "URL contains control characters." };

  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { ok: false, reason: "Not a valid absolute URL." }; }

  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    return { ok: false, reason: allowHttp ? "Only http and https URLs are allowed." : "Only https URLs are allowed." };
  }
  if (url.username || url.password) return { ok: false, reason: "URLs containing credentials are not allowed." };
  if (!ALLOWED_PORTS.has(url.port)) return { ok: false, reason: "Only the default http/https ports are allowed." };

  let host = url.hostname.toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host) return { ok: false, reason: "URL has no host." };

  if (host.startsWith("[") && host.endsWith("]")) {
    const ip = host.slice(1, -1);
    if (isBlockedIPv6(ip)) return { ok: false, reason: "Target address is in a blocked (private/reserved) range." };
    return { ok: true, url };
  }
  // WHATWG URL already normalises decimal/hex/octal IPv4 forms to dotted quads.
  if (/^[\d.]+$/.test(host)) {
    if (!parseIPv4(host)) return { ok: false, reason: "Malformed IP address." };
    if (isBlockedIPv4(host)) return { ok: false, reason: "Target address is in a blocked (private/reserved) range." };
    return { ok: true, url };
  }
  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: "Internal hostnames are not allowed." };
  }
  if (!host.includes(".")) return { ok: false, reason: "Single-label hostnames are not allowed." };
  return { ok: true, url };
}

export function isIpLiteralHost(hostname: string): boolean {
  return hostname.startsWith("[") || /^[\d.]+$/.test(hostname);
}

// ---------------------------------------------------------------- request shaping

const FORBIDDEN_REQUEST_HEADERS = new Set([
  "host", "connection", "content-length", "transfer-encoding", "upgrade", "te", "trailer", "keep-alive",
  "proxy-authorization", "proxy-authenticate", "proxy-connection", "cookie", "cookie2", "origin", "referer",
  "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-real-ip", "forwarded", "via", "expect",
  "x-forwarded-port", "cf-connecting-ip", "true-client-ip",
]);

export type HeaderResult = { ok: true; headers: Record<string, string>; dropped: string[] } | { ok: false; reason: string };

/** Validate and sanitise caller-supplied headers. Forbidden headers are dropped, malformed ones rejected. */
export function sanitizeRequestHeaders(input: unknown): HeaderResult {
  if (input == null) return { ok: true, headers: {}, dropped: [] };
  if (typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "Headers must be a JSON object." };
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > MAX_HEADER_COUNT) return { ok: false, reason: `At most ${MAX_HEADER_COUNT} headers are allowed.` };
  const headers: Record<string, string> = {};
  const dropped: string[] = [];
  for (const [rawName, rawValue] of entries) {
    const name = rawName.trim();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) return { ok: false, reason: `Invalid header name: ${JSON.stringify(rawName)}.` };
    if (typeof rawValue !== "string") return { ok: false, reason: `Header "${name}" must have a string value.` };
    if (rawValue.length > MAX_HEADER_VALUE_LENGTH) return { ok: false, reason: `Header "${name}" is too long.` };
    if (/[\r\n\u0000]/.test(rawValue)) return { ok: false, reason: `Header "${name}" contains illegal characters.` };
    const lower = name.toLowerCase();
    if (FORBIDDEN_REQUEST_HEADERS.has(lower) || lower.startsWith("sec-") || lower.startsWith("proxy-")) { dropped.push(name); continue; }
    headers[name] = rawValue;
  }
  return { ok: true, headers, dropped };
}

const SAFE_RESPONSE_HEADERS = new Set([
  "content-type", "content-length", "content-language", "content-encoding", "cache-control", "etag", "expires",
  "last-modified", "location", "retry-after", "link", "date", "server", "vary", "allow", "content-disposition",
  "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "ratelimit-limit", "ratelimit-remaining", "ratelimit-reset",
  "x-request-id", "access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers",
]);

/** Keep only an allow-list of response headers (never `set-cookie`). */
export function filterResponseHeaders(headers: Iterable<[string, string]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of headers) if (SAFE_RESPONSE_HEADERS.has(k.toLowerCase())) out[k.toLowerCase()] = v;
  return out;
}

export function isAllowedMethod(m: unknown): m is HttpMethod {
  return typeof m === "string" && (ALLOWED_METHODS as readonly string[]).includes(m);
}

export function methodAllowsBody(m: HttpMethod): boolean {
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

export function byteLength(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

// ---------------------------------------------------------------- rate limiting

/** Fixed-window limiter keyed by caller. In-memory: per edge-isolate, so it is a best-effort brake, not a global quota. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  private limit: number;
  private windowMs: number;
  private maxKeys: number;
  constructor(limit: number, windowMs: number, maxKeys = 5000) {
    this.limit = limit; this.windowMs = windowMs; this.maxKeys = maxKeys;
  }

  check(key: string, now = Date.now()): { allowed: boolean; remaining: number; retryAfterSec: number } {
    if (this.hits.size > this.maxKeys) this.sweep(now);
    const cur = this.hits.get(key);
    if (!cur || cur.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1, retryAfterSec: 0 };
    }
    if (cur.count >= this.limit) return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) };
    cur.count += 1;
    return { allowed: true, remaining: this.limit - cur.count, retryAfterSec: 0 };
  }

  private sweep(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    if (this.hits.size > this.maxKeys) this.hits.clear();
  }
}
