// Playground request history. Credentials are redacted BEFORE anything is persisted.

export const REDACTED = "[redacted]";
const SENSITIVE_HEADER = /^(authorization|proxy-authorization|x-api-key|api-key|apikey|x-auth-token|x-access-token|cookie|x-token)$/i;
const SENSITIVE_KEY = /(^|[_-])(api[_-]?key|apikey|key|token|access[_-]?token|secret|password|passwd|pwd|auth|signature|sig|client[_-]?secret)$/i;

export interface HistoryEntry {
  id: string; at: string; method: string; url: string;
  headers: Record<string, string>; body?: string; status?: number; elapsedMs?: number;
}

export function redactHeaders(h: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, SENSITIVE_HEADER.test(k) ? REDACTED : v]));
}

export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    for (const k of [...u.searchParams.keys()]) if (SENSITIVE_KEY.test(k)) u.searchParams.set(k, REDACTED);
    u.username = ""; u.password = "";
    return decodeURI(u.toString());
  } catch { return raw; }
}

function redactJson(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(redactJson);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, SENSITIVE_KEY.test(k) ? REDACTED : redactJson(val)]));
  }
  return v;
}

/** Bodies are kept only when they are small JSON with sensitive keys masked; anything else is dropped. */
export function redactBody(body: string | undefined): string | undefined {
  if (!body || body.length > 4000) return undefined;
  try { return JSON.stringify(redactJson(JSON.parse(body)), null, 2); } catch { return undefined; }
}

export function makeEntry(input: { method: string; url: string; headers: Record<string, string>; body?: string; status?: number; elapsedMs?: number }, now = new Date(), id = Math.random().toString(36).slice(2, 10)): HistoryEntry {
  return { id, at: now.toISOString(), method: input.method, url: redactUrl(input.url), headers: redactHeaders(input.headers), body: redactBody(input.body), status: input.status, elapsedMs: input.elapsedMs };
}

/** Newest first, de-duplicated on method+url, capped. */
export function addHistory(list: HistoryEntry[], entry: HistoryEntry, max = 25): HistoryEntry[] {
  return [entry, ...list.filter((e) => !(e.method === entry.method && e.url === entry.url))].slice(0, max);
}

/** Headers that are safe to re-send when restoring an entry (redacted ones must be re-entered). */
export function restorableHeaders(h: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(h).filter(([, v]) => v !== REDACTED));
}

export function restorableBody(body: string | undefined): string | undefined {
  return body && !body.includes(REDACTED) ? body : undefined;
}

export function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e): HistoryEntry[] => {
    if (!e || typeof e !== "object") return [];
    const o = e as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.url !== "string" || typeof o.method !== "string" || typeof o.at !== "string") return [];
    const headers = o.headers && typeof o.headers === "object" && !Array.isArray(o.headers)
      ? Object.fromEntries(Object.entries(o.headers as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string> : {};
    return [{ id: o.id, at: o.at, method: o.method, url: o.url, headers: redactHeaders(headers), body: typeof o.body === "string" ? o.body : undefined,
      status: typeof o.status === "number" ? o.status : undefined, elapsedMs: typeof o.elapsedMs === "number" ? o.elapsedMs : undefined }];
  }).slice(0, 25);
}
