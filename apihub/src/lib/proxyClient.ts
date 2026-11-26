// Sends a request either straight from the browser ("direct", CORS applies) or through the
// APIHub secure-proxy edge function ("proxy"). Always validates the target first.
import { validateTargetUrl, isAllowedMethod, sanitizeRequestHeaders } from "./urlSafety.ts";
import type { CheckFailure } from "./verification.ts";

export type Mode = "direct" | "proxy";

export interface ProxyConfig { supabaseUrl?: string; anonKey?: string }
export interface SendInput { method: string; url: string; headers: Record<string, string>; body?: string; mode: Mode }

export interface SendResult {
  ok: boolean;
  status?: number; statusText?: string; headers: Record<string, string>; body: string;
  elapsedMs: number; truncated: boolean; finalUrl?: string; dropped?: string[];
  failure?: CheckFailure; error?: string;
}

export const isProxyConfigured = (c: ProxyConfig) => Boolean(c.supabaseUrl && c.anonKey);
const DIRECT_TIMEOUT_MS = 15_000;
const MAX_DIRECT_BODY_CHARS = 1_000_000;

const fail = (failure: CheckFailure, error: string, elapsedMs = 0): SendResult => ({ ok: false, headers: {}, body: "", elapsedMs, truncated: false, failure, error });

export async function sendRequest(input: SendInput, config: ProxyConfig, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  const method = input.method.toUpperCase();
  if (!isAllowedMethod(method)) return fail("blocked", "Unsupported HTTP method.");
  const target = validateTargetUrl(input.url);
  if (!target.ok) return fail("blocked", target.reason);
  const headers = sanitizeRequestHeaders(input.headers);
  if (!headers.ok) return fail("blocked", headers.reason);

  return input.mode === "proxy" ? viaProxy(method, target.url.toString(), headers.headers, input.body, config, fetchImpl) : direct(method, target.url.toString(), headers.headers, input.body, fetchImpl);
}

async function direct(method: string, url: string, headers: Record<string, string>, body: string | undefined, fetchImpl: typeof fetch): Promise<SendResult> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);
  try {
    const init: RequestInit = { method, headers: { ...headers }, signal: controller.signal, credentials: "omit", redirect: "follow", referrerPolicy: "no-referrer" };
    if (body && method !== "GET") {
      init.body = body;
      if (!Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    }
    const res = await fetchImpl(url, init);
    const text = await res.text();
    const truncated = text.length > MAX_DIRECT_BODY_CHARS;
    return {
      ok: true, status: res.status, statusText: res.statusText, headers: Object.fromEntries(res.headers.entries()),
      body: truncated ? text.slice(0, MAX_DIRECT_BODY_CHARS) : text, truncated, elapsedMs: Math.round(performance.now() - started), finalUrl: res.url || url,
    };
  } catch (e) {
    const elapsed = Math.round(performance.now() - started);
    if (e instanceof Error && e.name === "AbortError") return fail("timeout", "Request timed out after 15 seconds.", elapsed);
    return fail("browser-blocked", "The browser could not complete the request. This is usually a CORS restriction or a network error – try the APIHub proxy mode.", elapsed);
  } finally { clearTimeout(timer); }
}

async function viaProxy(method: string, url: string, headers: Record<string, string>, body: string | undefined, config: ProxyConfig, fetchImpl: typeof fetch): Promise<SendResult> {
  if (!isProxyConfigured(config)) return fail("proxy", "The APIHub proxy is not configured for this deployment.");
  const started = performance.now();
  try {
    const res = await fetchImpl(`${config.supabaseUrl!.replace(/\/$/, "")}/functions/v1/secure-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: config.anonKey!, Authorization: `Bearer ${config.anonKey!}` },
      body: JSON.stringify({ url, method, headers, body }),
    });
    const data = await res.json().catch(() => null) as Record<string, any> | null;
    const elapsed = Math.round(performance.now() - started);
    if (!data) return fail("proxy", `The proxy returned an unreadable response (HTTP ${res.status}).`, elapsed);
    if (res.status === 429) return fail("proxy", `Rate limit reached. Try again in ${data.retryAfterSeconds ?? "a few"} seconds.`, elapsed);
    if (res.status === 400 && data.code === "blocked") return fail("blocked", String(data.error ?? "Target blocked."), elapsed);
    if (data.code === "timeout") return fail("timeout", "The upstream request timed out.", elapsed);
    if (data.code === "network" || data.code === "dns") return fail("network", String(data.error ?? "Could not connect to the host."), elapsed);
    if (!res.ok || typeof data.status !== "number") return fail("proxy", String(data.error ?? `Proxy error (HTTP ${res.status}).`), elapsed);
    return {
      ok: true, status: data.status, statusText: String(data.statusText ?? ""), headers: data.headers ?? {}, body: String(data.body ?? ""),
      elapsedMs: typeof data.elapsedMs === "number" ? data.elapsedMs : elapsed, truncated: Boolean(data.truncated), finalUrl: data.finalUrl, dropped: data.droppedRequestHeaders,
    };
  } catch {
    return fail("proxy", "Could not reach the APIHub proxy.", Math.round(performance.now() - started));
  }
}
