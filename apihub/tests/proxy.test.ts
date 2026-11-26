// Exercises the real edge-function handler under Node by shimming the few Deno globals it uses
// (Deno.serve, Deno.env, Deno.resolveDns) and mocking global fetch. No network is touched.
import { test, before } from "node:test";
import assert from "node:assert/strict";

type Handler = (req: Request) => Promise<Response>;
let handler: Handler;
const dns: Record<string, { A?: string[]; AAAA?: string[] }> = {};
let upstream: (url: string, init: RequestInit) => Response | Promise<Response> = () => new Response("{}");
const upstreamCalls: Array<{ url: string; init: RequestInit }> = [];

before(async () => {
  (globalThis as any).Deno = {
    env: { get: (k: string) => ({ ALLOWED_ORIGINS: "https://app.example", PROXY_RATE_LIMIT: "5", PROXY_RATE_WINDOW_SECONDS: "60" } as Record<string, string>)[k] },
    serve: (h: Handler) => { handler = h; },
    resolveDns: async (host: string, type: "A" | "AAAA") => { const r = dns[host]?.[type]; if (!r) throw new Error("NXDOMAIN"); return r; },
  };
  (globalThis as any).fetch = async (input: URL | string, init: RequestInit) => { upstreamCalls.push({ url: String(input), init }); return upstream(String(input), init); };
  await import("../supabase/functions/secure-proxy/index.ts");
});

let ip = 0;
const call = (body: unknown, opts: { method?: string; origin?: string | null; ip?: string; raw?: string } = {}) =>
  handler(new Request("https://fn.example/secure-proxy", {
    method: opts.method ?? "POST",
    headers: { "content-type": "application/json", ...(opts.origin === null ? {} : { origin: opts.origin ?? "https://app.example" }), "x-forwarded-for": opts.ip ?? `10.9.${Math.floor(++ip / 250)}.${ip % 250}` },
    body: (opts.method ?? "POST") === "POST" ? (opts.raw ?? JSON.stringify(body)) : undefined,
  }));

test("rejects non-POST, disallowed origins and bad JSON", async () => {
  assert.equal((await call({}, { method: "GET" })).status, 405);
  assert.equal((await call({ url: "https://a.example" }, { origin: "https://evil.example" })).status, 403);
  assert.equal((await call({ url: "https://a.example" }, { origin: null })).status, 403);
  assert.equal((await call(null, { raw: "{not json" })).status, 400);
  const pre = await handler(new Request("https://fn.example", { method: "OPTIONS", headers: { origin: "https://app.example" } }));
  assert.equal(pre.status, 204); assert.equal(pre.headers.get("access-control-allow-origin"), "https://app.example");
});

test("blocks internal targets before any outbound request", async () => {
  upstreamCalls.length = 0;
  for (const url of ["http://localhost/", "http://169.254.169.254/latest/meta-data/", "http://10.0.0.5/", "http://[::1]/", "file:///etc/passwd", "https://u:p@a.example/"]) {
    const r = await call({ url }); assert.equal(r.status, 400, url);
    assert.equal((await r.json()).code ?? "blocked", "blocked");
  }
  assert.equal(upstreamCalls.length, 0, "no fetch should have happened");
});

test("blocks hostnames whose DNS points at private space (including mixed answers)", async () => {
  dns["rebind.example"] = { A: ["93.184.216.34", "127.0.0.1"] };
  dns["meta.example"] = { A: ["169.254.169.254"] };
  dns["v6.example"] = { AAAA: ["::ffff:10.0.0.1"] };
  upstreamCalls.length = 0;
  for (const h of ["rebind.example", "meta.example", "v6.example"]) assert.equal((await call({ url: `https://${h}/` })).status, 400, h);
  assert.equal(upstreamCalls.length, 0);
  assert.equal((await call({ url: "https://nxdomain.example/" })).status, 502);
});

test("proxies a public request, strips forbidden headers and Set-Cookie, reports metadata", async () => {
  dns["api.example"] = { A: ["93.184.216.34"] };
  upstreamCalls.length = 0;
  upstream = () => new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json", "set-cookie": "sid=1", "x-internal": "1" } });
  const r = await call({ url: "https://api.example/v1/x?y=1", method: "post", headers: { Accept: "application/json", Cookie: "a=b", Host: "evil" }, body: '{"a":1}' });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.status, 200); assert.equal(j.body, '{"ok":true}'); assert.equal(j.truncated, false);
  assert.deepEqual(j.headers, { "content-type": "application/json" });
  assert.deepEqual(j.droppedRequestHeaders.sort(), ["Cookie", "Host"]);
  assert.equal(typeof j.elapsedMs, "number");
  const sent = upstreamCalls[0].init;
  assert.equal(sent.method, "POST"); assert.equal(sent.redirect, "manual");
  const h = sent.headers as Record<string, string>;
  assert.ok(!("Cookie" in h) && !("Host" in h));
  assert.match(h["User-Agent"], /APIHub/);
});

test("re-validates every redirect hop (public → private is refused)", async () => {
  dns["start.example"] = { A: ["93.184.216.34"] };
  upstreamCalls.length = 0;
  upstream = () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data/" } });
  const r = await call({ url: "https://start.example/" });
  assert.equal(r.status, 400);
  assert.equal(upstreamCalls.length, 1, "only the first hop was fetched");
});

test("follows safe redirects, downgrades POST→GET on 302, and caps hops", async () => {
  dns["a.example"] = { A: ["93.184.216.34"] }; dns["b.example"] = { A: ["93.184.216.35"] };
  upstreamCalls.length = 0;
  upstream = (url) => url.startsWith("https://a.example") ? new Response(null, { status: 302, headers: { location: "https://b.example/final" } }) : new Response("done");
  const j = await (await call({ url: "https://a.example/", method: "POST", body: "{}" })).json();
  assert.equal(j.body, "done"); assert.equal(j.finalUrl, "https://b.example/final");
  assert.equal(upstreamCalls[1].init.method, "GET"); assert.equal(upstreamCalls[1].init.body, undefined);
  upstream = () => new Response(null, { status: 302, headers: { location: "https://a.example/loop" } });
  assert.equal((await call({ url: "https://a.example/" })).status, 502);
});

test("truncates oversized responses", async () => {
  dns["big.example"] = { A: ["93.184.216.34"] };
  upstream = () => new Response("x".repeat(1_500_000));
  const j = await (await call({ url: "https://big.example/" })).json();
  assert.equal(j.truncated, true); assert.equal(j.body.length, 1_000_000);
});

test("validates method, headers and body", async () => {
  dns["ok.example"] = { A: ["93.184.216.34"] };
  assert.equal((await call({ url: "https://ok.example/", method: "TRACE" })).status, 400);
  assert.equal((await call({ url: "https://ok.example/", method: "CONNECT" })).status, 400);
  assert.equal((await call({ url: "https://ok.example/", headers: { "X": "a\r\nB: c" } })).status, 400);
  assert.equal((await call({ url: "https://ok.example/", method: "GET", body: "x" })).status, 400);
  assert.equal((await call({ url: "https://ok.example/", method: "POST", body: "x".repeat(300_000) })).status, 413);
});

test("maps upstream failures to 504 without leaking internals", async () => {
  dns["down.example"] = { A: ["93.184.216.34"] };
  upstream = () => { throw new TypeError("connect ECONNREFUSED 10.1.2.3:443"); };
  const r = await call({ url: "https://down.example/" });
  assert.equal(r.status, 504);
  const text = JSON.stringify(await r.json());
  assert.ok(!text.includes("10.1.2.3"), text);
});

test("rate limits per client and sets Retry-After", async () => {
  dns["rl.example"] = { A: ["93.184.216.34"] };
  upstream = () => new Response("{}");
  const same = "203.0.113.77";
  const codes: number[] = [];
  for (let i = 0; i < 7; i++) codes.push((await call({ url: "https://rl.example/" }, { ip: same })).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429, 429]);
  const r = await call({ url: "https://rl.example/" }, { ip: same });
  assert.ok(Number(r.headers.get("retry-after")) >= 1);
  assert.equal((await call({ url: "https://rl.example/" }, { ip: "203.0.113.78" })).status, 200, "other clients unaffected");
});
