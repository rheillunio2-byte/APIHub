// APIHub secure proxy (Supabase Edge Function, Deno).
//
// Forwards a single, validated HTTP request on behalf of the Playground / API status checks so that
// browser CORS limits do not get in the way, while refusing anything that could reach internal
// infrastructure (SSRF). Defence layers, in order:
//   1. Origin allow-list (ALLOWED_ORIGINS) and per-client rate limiting.
//   2. Method / header / body validation (shared rules in ../_shared/ssrf.ts).
//   3. URL validation, then DNS resolution with EVERY returned address checked against private ranges.
//   4. Manual redirect handling: each hop is re-validated, hops are capped.
//   5. Timeout, response-size cap, response-header allow-list (never Set-Cookie).
//
// Known limitation: DNS is resolved by this function and again by fetch(), so a hostile resolver could
// in theory answer differently the second time (DNS rebinding). Deploy behind an egress firewall that
// blocks private ranges if you need defence in depth. See docs/ARCHITECTURE.md.
import {
  validateTargetUrl, isBlockedIp, isIpLiteralHost, sanitizeRequestHeaders, filterResponseHeaders,
  isAllowedMethod, methodAllowsBody, byteLength, RateLimiter, MAX_BODY_BYTES,
} from "../_shared/ssrf.ts";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
  resolveDns(host: string, type: "A" | "AAAA"): Promise<string[]>;
};

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const USER_AGENT = "APIHub-Proxy/1.0 (+https://github.com/rheillunio2-byte/APIHub)";

const intEnv = (name: string, fallback: number) => {
  const n = Number.parseInt(Deno.env.get(name) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const limiter = new RateLimiter(intEnv("PROXY_RATE_LIMIT", 20), intEnv("PROXY_RATE_WINDOW_SECONDS", 60) * 1000);

const allowedOrigins = () => (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

class ProxyError extends Error {
  status: number; code: string; extra: Record<string, unknown>;
  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
    super(message); this.status = status; this.code = code; this.extra = extra;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "access-control-allow-origin": origin ?? "",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

const json = (status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders(origin), ...extra } });

const clientKey = (req: Request) =>
  (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("cf-connecting-ip") ?? "unknown").trim();

async function resolveAll(host: string): Promise<string[]> {
  const settle = async (type: "A" | "AAAA") => { try { return await Deno.resolveDns(host, type); } catch { return [] as string[]; } };
  const [a, aaaa] = await Promise.all([settle("A"), settle("AAAA")]);
  return [...a, ...aaaa];
}

/** Validate a URL and make sure every address its hostname resolves to is public. Throws ProxyError. */
async function assertPublicTarget(raw: string): Promise<URL> {
  const check = validateTargetUrl(raw);
  if (!check.ok) throw new ProxyError(400, "blocked", check.reason);
  if (isIpLiteralHost(check.url.hostname)) return check.url;
  const addresses = await resolveAll(check.url.hostname);
  if (!addresses.length) throw new ProxyError(502, "dns", "The host name could not be resolved.");
  if (addresses.some(isBlockedIp)) throw new ProxyError(400, "blocked", "Target resolves to a blocked (private/reserved) address.");
  return check.url;
}

async function readCapped(res: Response): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0; let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.byteLength > MAX_RESPONSE_BYTES) {
      chunks.push(value.subarray(0, MAX_RESPONSE_BYTES - size)); size = MAX_RESPONSE_BYTES; truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value); size += value.byteLength;
  }
  const all = new Uint8Array(size); let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.byteLength; }
  return { text: new TextDecoder().decode(all), truncated };
}

async function handle(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const originOk = !!origin && allowedOrigins().includes(origin);

  if (req.method === "OPTIONS") {
    return originOk ? new Response(null, { status: 204, headers: corsHeaders(origin) }) : new Response(null, { status: 403 });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed.", code: "method" }, originOk ? origin : null, { allow: "POST, OPTIONS" });
  if (!originOk) return json(403, { error: "Origin not allowed.", code: "origin" }, null);

  const rate = limiter.check(clientKey(req));
  if (!rate.allowed) {
    return json(429, { error: "Rate limit reached.", code: "rate", retryAfterSeconds: rate.retryAfterSec }, origin, { "retry-after": String(rate.retryAfterSec) });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    payload = parsed as Record<string, unknown>;
  } catch { return json(400, { error: "Request body must be a JSON object.", code: "bad-request" }, origin); }

  try {
    const method = String(payload.method ?? "GET").toUpperCase();
    if (!isAllowedMethod(method)) throw new ProxyError(400, "bad-request", "Unsupported HTTP method.");
    const headers = sanitizeRequestHeaders(payload.headers);
    if (!headers.ok) throw new ProxyError(400, "bad-request", headers.reason);

    let body: string | undefined;
    if (payload.body != null && payload.body !== "") {
      if (typeof payload.body !== "string") throw new ProxyError(400, "bad-request", "Body must be a string.");
      if (!methodAllowsBody(method)) throw new ProxyError(400, "bad-request", `${method} requests cannot have a body.`);
      if (byteLength(payload.body) > MAX_BODY_BYTES) throw new ProxyError(413, "too-large", "Request body is too large.");
      body = payload.body;
    }
    if (typeof payload.url !== "string") throw new ProxyError(400, "blocked", "URL is required.");

    const started = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      let url = await assertPublicTarget(payload.url);
      let currentMethod: string = method;
      let currentBody = body;
      let res: Response | undefined;

      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const sendHeaders: Record<string, string> = { ...headers.headers, "User-Agent": USER_AGENT };
        if (currentBody && !Object.keys(sendHeaders).some((k) => k.toLowerCase() === "content-type")) sendHeaders["Content-Type"] = "application/json";
        res = await fetch(url, { method: currentMethod, headers: sendHeaders, body: currentBody, redirect: "manual", signal: controller.signal });

        if (![301, 302, 303, 307, 308].includes(res.status)) break;
        const location = res.headers.get("location");
        if (!location) break;
        if (hop === MAX_REDIRECTS) throw new ProxyError(502, "redirects", "Too many redirects.");
        await res.body?.cancel().catch(() => {});
        let next: string;
        try { next = new URL(location, url).toString(); } catch { throw new ProxyError(502, "redirects", "Invalid redirect location."); }
        url = await assertPublicTarget(next); // every hop is re-validated, public → private is refused
        if (res.status === 303 || ((res.status === 301 || res.status === 302) && currentMethod !== "GET" && currentMethod !== "HEAD")) {
          currentMethod = "GET"; currentBody = undefined;
        }
      }

      const { text, truncated } = await readCapped(res!);
      return json(200, {
        status: res!.status, statusText: res!.statusText, headers: filterResponseHeaders(res!.headers.entries()),
        body: text, truncated, finalUrl: url.toString(), elapsedMs: Math.round(performance.now() - started),
        droppedRequestHeaders: headers.dropped,
      }, origin);
    } finally { clearTimeout(timer); }
  } catch (e) {
    if (e instanceof ProxyError) return json(e.status, { error: e.message, code: e.code, ...e.extra }, origin);
    if (e instanceof Error && e.name === "AbortError") return json(504, { error: "The upstream request timed out.", code: "timeout" }, origin);
    // Never echo internal error text (it can contain addresses or stack details).
    console.error("secure-proxy upstream failure", e instanceof Error ? e.name : "unknown");
    return json(504, { error: "Could not complete the upstream request.", code: "network" }, origin);
  }
}

Deno.serve(handle);
