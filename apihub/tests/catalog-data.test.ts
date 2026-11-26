import { test } from "node:test";
import assert from "node:assert/strict";
import { apis, categories } from "../src/data/apis.ts";
import { validateTargetUrl } from "../src/lib/urlSafety.ts";

const norm = (u: string) => u.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");

test("ids are unique", () => {
  const seen = new Map<string, number>();
  apis.forEach((a) => seen.set(a.id, (seen.get(a.id) ?? 0) + 1));
  assert.deepEqual([...seen].filter(([, n]) => n > 1).map(([id]) => id), []);
});

test("no duplicate entries (same name, or same base URL + docs URL)", () => {
  const byName = new Map<string, string[]>(); const byDocs = new Map<string, string[]>();
  for (const a of apis) {
    byName.set(a.name.toLowerCase(), [...(byName.get(a.name.toLowerCase()) ?? []), a.id]);
    const k = `${norm(a.baseUrl)}|${norm(a.docs)}`; byDocs.set(k, [...(byDocs.get(k) ?? []), a.id]);
  }
  const dupes = [...byName.values(), ...byDocs.values()].filter((v) => v.length > 1);
  assert.deepEqual(dupes, [], `duplicate groups: ${JSON.stringify(dupes)}`);
});

test("every category is declared and every declared category is used", () => {
  const used = new Set(apis.map((a) => a.category));
  assert.deepEqual([...used].filter((c) => !categories.includes(c)), []);
  assert.deepEqual(categories.filter((c) => !used.has(c)), []);
});

test("required fields are present and URLs are well-formed", () => {
  for (const a of apis) {
    assert.ok(a.name.trim() && a.description.trim() && a.provider.trim(), a.id);
    for (const [label, u] of [["website", a.website], ["docs", a.docs], ["baseUrl", a.baseUrl]] as const) {
      assert.doesNotThrow(() => new URL(u), `${a.id}.${label} is not a URL: ${u}`);
    }
    assert.ok(a.methods.length > 0 && a.methods.every((m) => ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m)), `${a.id} methods`);
  }
});

test("https flag agrees with the base URL", () => {
  for (const a of apis) assert.equal(a.https, a.baseUrl.startsWith("https://"), `${a.id}: https flag vs ${a.baseUrl}`);
});

test("no catalog record claims to be verified without a verification date", () => {
  for (const a of apis) if (a.verification === "Verified") assert.notEqual(a.lastVerified, "Not recently verified", a.id);
});

test("example endpoints pass the SSRF validator and carry no real-looking secrets", () => {
  for (const a of apis) {
    if (!a.exampleEndpoint) continue;
    const u = a.exampleEndpoint.replace("<TOKEN>", "TOKEN");
    if (/YOUR_|ACXXXXX|<|>/.test(u)) continue; // documented placeholders
    assert.ok(validateTargetUrl(u).ok, `${a.id}: ${u}`);
    assert.ok(!/(api[_-]?key|token|access_key|client_id)=(?!YOUR_KEY|DEMO_KEY|demo\b)[^&]{8,}/i.test(u), `${a.id} embeds a key`);
  }
});

test("APIs that need credentials are not tagged beginner-friendly", () => {
  for (const a of apis) if (a.auth !== "No key") assert.equal(a.beginner, false, a.id);
});

test("pricing/auth values are from the declared vocabulary", () => {
  for (const a of apis) {
    assert.ok(["Free", "Freemium", "Paid", "Free trial"].includes(a.pricing), a.id);
    assert.ok(["No key", "API key", "OAuth", "Other"].includes(a.auth), a.id);
  }
});
