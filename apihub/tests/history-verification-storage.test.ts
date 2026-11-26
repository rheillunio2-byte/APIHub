import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEntry, addHistory, redactUrl, redactBody, restorableHeaders, restorableBody, parseHistory, REDACTED } from "../src/lib/history.ts";
import { classifyCheck } from "../src/lib/verification.ts";
import { parseCollections, parseFavorites } from "../src/lib/storage.ts";

test("history never persists credentials", () => {
  const e = makeEntry({
    method: "POST", url: "https://u:p@api.x.com/v1?api_key=ABC123&q=cats&access_token=zzz",
    headers: { Authorization: "Bearer SECRET", "X-API-Key": "SECRET2", Accept: "application/json" },
    body: JSON.stringify({ name: "n", password: "hunter2", nested: { client_secret: "s3", ok: 1 } }),
  });
  const blob = JSON.stringify(e);
  for (const s of ["ABC123", "SECRET", "SECRET2", "hunter2", "zzz", "s3", "u:p@"]) assert.ok(!blob.includes(s), `leaked ${s}: ${blob}`);
  assert.ok(blob.includes("q=cats"));
  assert.equal(e.headers.Accept, "application/json");
});

test("non-JSON and oversized bodies are dropped; restore skips redacted values", () => {
  assert.equal(redactBody("password=abc"), undefined);
  assert.equal(redactBody("x".repeat(5000)), undefined);
  assert.deepEqual(restorableHeaders({ Authorization: REDACTED, Accept: "a" }), { Accept: "a" });
  assert.equal(restorableBody(redactBody('{"token":"t"}')), undefined);
  assert.ok(restorableBody(redactBody('{"a":1}')));
  assert.equal(redactUrl("not a url"), "not a url");
});

test("addHistory dedupes on method+url, caps length, newest first", () => {
  let list = [] as ReturnType<typeof addHistory>;
  for (let i = 0; i < 30; i++) list = addHistory(list, makeEntry({ method: "GET", url: `https://a.example/${i}`, headers: {} }, new Date(), String(i)));
  assert.equal(list.length, 25); assert.equal(list[0].url, "https://a.example/29");
  list = addHistory(list, makeEntry({ method: "GET", url: "https://a.example/29", headers: {} }));
  assert.equal(list.length, 25);
});

test("parseHistory rejects malformed storage and re-redacts", () => {
  assert.deepEqual(parseHistory("nope"), []);
  assert.deepEqual(parseHistory([null, 1, { id: 1 }]), []);
  const [e] = parseHistory([{ id: "a", at: "t", method: "GET", url: "https://x.y", headers: { Authorization: "Bearer leak" } }]);
  assert.equal(e.headers.Authorization, REDACTED);
});

test("verification keeps the four states distinct and conservative", () => {
  assert.equal(classifyCheck({}).status, "Untested");
  assert.equal(classifyCheck({ statusCode: 200 }).status, "Reachable");
  assert.equal(classifyCheck({ statusCode: 301 }).status, "Reachable");
  assert.equal(classifyCheck({ statusCode: 401 }).status, "Reachable");
  assert.equal(classifyCheck({ statusCode: 429 }).status, "Reachable");
  assert.equal(classifyCheck({ statusCode: 404 }).status, "Unavailable");
  assert.equal(classifyCheck({ statusCode: 503 }).status, "Unavailable");
  assert.equal(classifyCheck({ statusCode: 422 }).status, "Reachable");
  assert.equal(classifyCheck({ failure: "timeout" }).status, "Unavailable");
  assert.equal(classifyCheck({ failure: "network" }).status, "Unavailable");
  for (const failure of ["blocked", "proxy", "browser-blocked"] as const) assert.equal(classifyCheck({ failure }).status, "Verification failed");
  assert.match(classifyCheck({ failure: "browser-blocked" }).detail, /not mean the API is down/);
});

test("storage parsers sanitise corrupted data", () => {
  assert.deepEqual(parseFavorites(["a", "a", 3, null, "b"]), ["a", "b"]);
  assert.deepEqual(parseFavorites("x"), []);
  const cols = parseCollections([{ id: "1", name: "Ok", apiIds: ["a", 2] }, { id: 2 }, { id: "3", name: "  " }, "x"]);
  assert.deepEqual(cols, [{ id: "1", name: "Ok", description: "", apiIds: ["a"] }]);
  assert.equal(parseCollections("junk").length, 1, "falls back to default starter collection");
});
