import { test } from "node:test";
import assert from "node:assert/strict";
import { sendRequest } from "../src/lib/proxyClient.ts";
import { tokenizeJson, formatJson } from "../src/lib/jsonHighlight.ts";

const cfg = { supabaseUrl: "https://proj.supabase.co/", anonKey: "anon" };
const base = { method: "GET", url: "https://api.example.com/x", headers: {}, mode: "proxy" as const };
const respond = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

test("refuses unsafe targets locally in both modes without calling fetch", async () => {
  let called = 0; const f = (async () => { called++; return new Response("{}"); }) as unknown as typeof fetch;
  for (const mode of ["direct", "proxy"] as const) {
    for (const url of ["http://localhost:3000", "http://169.254.169.254/", "http://192.168.0.1/admin", "file:///etc/passwd"]) {
      const r = await sendRequest({ ...base, url, mode }, cfg, f);
      assert.equal(r.ok, false); assert.equal(r.failure, "blocked");
    }
  }
  assert.equal(called, 0);
  assert.equal((await sendRequest({ ...base, method: "TRACE" }, cfg, f)).failure, "blocked");
});

test("proxy mode posts to the edge function with anon credentials only", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const f = (async (url: string, init: RequestInit) => { seen = { url, init }; return new Response(JSON.stringify({ status: 201, statusText: "Created", headers: { "content-type": "application/json" }, body: "{}", elapsedMs: 42, truncated: false, finalUrl: "https://api.example.com/x" }), { status: 200 }); }) as unknown as typeof fetch;
  const r = await sendRequest({ ...base, method: "POST", headers: { "X-Api-Key": "user-secret" }, body: "{}" }, cfg, f);
  assert.equal(r.ok, true); assert.equal(r.status, 201); assert.equal(r.elapsedMs, 42);
  assert.equal(seen!.url, "https://proj.supabase.co/functions/v1/secure-proxy");
  const h = seen!.init.headers as Record<string, string>;
  assert.equal(h.apikey, "anon"); assert.equal(h.Authorization, "Bearer anon");
  assert.equal(JSON.parse(seen!.init.body as string).headers["X-Api-Key"], "user-secret", "user's own header is forwarded in the body, not used for APIHub auth");
});

test("proxy error codes map to verification failures", async () => {
  assert.equal((await sendRequest(base, cfg, respond(429, { error: "x", retryAfterSeconds: 9 }))).failure, "proxy");
  assert.match((await sendRequest(base, cfg, respond(429, { error: "x", retryAfterSeconds: 9 }))).error!, /9 seconds/);
  assert.equal((await sendRequest(base, cfg, respond(400, { error: "blocked", code: "blocked" }))).failure, "blocked");
  assert.equal((await sendRequest(base, cfg, respond(504, { error: "t", code: "timeout" }))).failure, "timeout");
  assert.equal((await sendRequest(base, cfg, respond(504, { error: "n", code: "network" }))).failure, "network");
  assert.equal((await sendRequest(base, cfg, respond(502, { error: "d", code: "dns" }))).failure, "network");
  assert.equal((await sendRequest(base, cfg, (async () => { throw new Error("offline"); }) as unknown as typeof fetch)).failure, "proxy");
  assert.equal((await sendRequest(base, cfg, (async () => new Response("<html>", { status: 502 })) as unknown as typeof fetch)).failure, "proxy");
  assert.equal((await sendRequest(base, {}, respond(200, {}))).failure, "proxy", "unconfigured proxy");
});

test("direct mode: returns the response, never sends cookies, maps failures", async () => {
  let init: RequestInit | undefined;
  const ok = (async (_u: string, i: RequestInit) => { init = i; return new Response('{"a":1}', { status: 200, headers: { "content-type": "application/json" } }); }) as unknown as typeof fetch;
  const r = await sendRequest({ ...base, mode: "direct" }, cfg, ok);
  assert.equal(r.status, 200); assert.equal(r.body, '{"a":1}'); assert.equal(init!.credentials, "omit");
  const cors = await sendRequest({ ...base, mode: "direct" }, cfg, (async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch);
  assert.equal(cors.failure, "browser-blocked");
  const abort = await sendRequest({ ...base, mode: "direct" }, cfg, (async () => { const e = new Error("a"); e.name = "AbortError"; throw e; }) as unknown as typeof fetch);
  assert.equal(abort.failure, "timeout");
  const post = await sendRequest({ ...base, method: "POST", body: "{}", mode: "direct" }, cfg, ok);
  assert.equal((init!.headers as Record<string, string>)["Content-Type"], "application/json"); assert.equal(post.ok, true);
});

test("JSON tokenizer round-trips text exactly and classifies tokens", () => {
  const src = '{\n  "a": [1, -2.5e3, true, null],\n  "b": "x\\"y"\n}';
  const toks = tokenizeJson(src);
  assert.equal(toks.map((t) => t.text).join(""), src);
  assert.deepEqual(toks.filter((t) => t.type === "key").map((t) => t.text), ['"a"', '"b"']);
  assert.ok(toks.some((t) => t.type === "number" && t.text === "-2.5e3"));
  assert.ok(toks.some((t) => t.type === "boolean") && toks.some((t) => t.type === "null"));
  assert.ok(toks.some((t) => t.type === "string" && t.text === '"x\\"y"'));
  const html = "<img src=x onerror=alert(1)>";
  assert.equal(tokenizeJson(html).map((t) => t.text).join(""), html, "non-JSON passes through as text");
});

test("formatJson", () => {
  assert.deepEqual(formatJson('{"a":1}'), { formatted: '{\n  "a": 1\n}', isJson: true });
  assert.deepEqual(formatJson("plain"), { formatted: "plain", isJson: false });
});
