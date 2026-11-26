import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateTargetUrl, isBlockedIp, sanitizeRequestHeaders, filterResponseHeaders, RateLimiter, byteLength, isAllowedMethod,
} from "../supabase/functions/_shared/ssrf.ts";

const blocked = (u: string) => assert.equal(validateTargetUrl(u).ok, false, `expected blocked: ${u}`);
const allowed = (u: string) => assert.equal(validateTargetUrl(u).ok, true, `expected allowed: ${u}`);

test("allows ordinary public API URLs", () => {
  allowed("https://jsonplaceholder.typicode.com/posts/1");
  allowed("https://api.open-meteo.com/v1/forecast?latitude=35&longitude=139");
  allowed("http://ip-api.com/json/8.8.8.8");
  allowed("https://8.8.8.8/dns-query");
  allowed("https://[2606:4700:4700::1111]/");
});

test("blocks localhost and internal hostnames", () => {
  for (const u of [
    "http://localhost/", "http://localhost:3000/", "https://LOCALHOST/", "http://foo.localhost/", "http://printer.local/",
    "http://metadata.google.internal/computeMetadata/v1/", "http://service.internal/", "http://intranet/", "http://localhost./",
  ]) blocked(u);
});

test("blocks private, loopback, link-local and metadata IPv4", () => {
  for (const u of [
    "http://127.0.0.1/", "http://127.1.2.3/", "http://10.0.0.1/", "http://172.16.0.1/", "http://172.31.255.255/",
    "http://192.168.1.1/", "http://169.254.169.254/latest/meta-data/", "http://0.0.0.0/", "http://100.64.0.1/",
    "http://224.0.0.1/", "http://255.255.255.255/", "http://198.18.0.1/",
  ]) blocked(u);
  allowed("http://172.32.0.1/"); // just outside 172.16/12
  allowed("http://11.0.0.1/");
});

test("blocks obfuscated IPv4 forms (decimal, hex, octal, short)", () => {
  for (const u of [
    "http://2130706433/", "http://0x7f000001/", "http://017700000001/", "http://127.1/", "http://0177.0.0.1/",
    "http://2852039166/", "http://0xA9FEA9FE/",
  ]) blocked(u);
});

test("blocks private and mapped IPv6", () => {
  for (const u of [
    "http://[::1]/", "http://[::]/", "http://[fe80::1]/", "http://[fc00::1]/", "http://[fd12:3456::1]/",
    "http://[::ffff:127.0.0.1]/", "http://[::ffff:169.254.169.254]/", "http://[::ffff:7f00:1]/", "http://[64:ff9b::7f00:1]/",
    "http://[2002:7f00:1::]/", "http://[ff02::1]/", "http://[2001:db8::1]/",
  ]) blocked(u);
  assert.equal(isBlockedIp("::ffff:8.8.8.8"), false);
});

test("rejects unsafe schemes, credentials, ports and malformed input", () => {
  for (const u of [
    "file:///etc/passwd", "ftp://example.com/", "gopher://example.com/", "javascript:alert(1)", "data:text/html,hi",
    "https://user:pass@example.com/", "https://example.com:8080/", "https://example.com:22/", "not a url", "", "   ",
    "https://example\u0000.com/", "https://" + "a".repeat(3000) + ".com/",
  ]) blocked(u);
  assert.equal(validateTargetUrl("http://example.com/", { allowHttp: false }).ok, false);
  assert.equal(validateTargetUrl("https://example.com/", { allowHttp: false }).ok, true);
});

test("does not mistake lookalike public hosts for internal ones", () => {
  allowed("https://localhost.example.com/");
  allowed("https://internal-tools.example.com/");
  allowed("https://notlocal.dev/");
});

test("sanitizeRequestHeaders drops hop-by-hop/identity headers and rejects injection", () => {
  const ok = sanitizeRequestHeaders({ Accept: "application/json", Host: "evil", Cookie: "a=b", "X-Forwarded-For": "1.1.1.1", "Sec-Fetch-Mode": "x", "X-Api-Key": "k" });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.deepEqual(Object.keys(ok.headers).sort(), ["Accept", "X-Api-Key"]);
    assert.deepEqual(ok.dropped.sort(), ["Cookie", "Host", "Sec-Fetch-Mode", "X-Forwarded-For"]);
  }
  assert.equal(sanitizeRequestHeaders({ "X-A": "a\r\nInjected: 1" }).ok, false);
  assert.equal(sanitizeRequestHeaders({ "bad name": "v" }).ok, false);
  assert.equal(sanitizeRequestHeaders({ A: 1 }).ok, false);
  assert.equal(sanitizeRequestHeaders([]).ok, false);
  assert.equal(sanitizeRequestHeaders(Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`H${i}`, "v"]))).ok, false);
  assert.ok(sanitizeRequestHeaders(undefined).ok);
});

test("filterResponseHeaders never forwards set-cookie", () => {
  const out = filterResponseHeaders([["Content-Type", "application/json"], ["Set-Cookie", "s=1"], ["X-Secret", "1"], ["ETag", "abc"]]);
  assert.deepEqual(out, { "content-type": "application/json", etag: "abc" });
});

test("isAllowedMethod and byteLength", () => {
  assert.ok(isAllowedMethod("PATCH"));
  assert.ok(!isAllowedMethod("TRACE"));
  assert.ok(!isAllowedMethod("get"));
  assert.equal(byteLength("abc"), 3);
  assert.equal(byteLength("é"), 2);
  assert.equal(byteLength("€"), 3);
  assert.equal(byteLength("😀"), 4);
});

test("RateLimiter enforces the window and recovers", () => {
  const rl = new RateLimiter(3, 1000);
  assert.ok(rl.check("a", 0).allowed);
  assert.ok(rl.check("a", 10).allowed);
  assert.ok(rl.check("a", 20).allowed);
  const denied = rl.check("a", 30);
  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfterSec >= 1);
  assert.ok(rl.check("b", 30).allowed, "other callers unaffected");
  assert.ok(rl.check("a", 1001).allowed, "window resets");
});
