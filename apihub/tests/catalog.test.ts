import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, sortApis, paginate, parseFilters, filtersToParams, DEFAULT_FILTERS, suggest, matchesQuery, categoryCounts } from "../src/lib/catalog.ts";
import type { ApiRecord } from "../src/types/index.ts";

const mk = (o: Partial<ApiRecord> & { id: string; name: string }): ApiRecord => ({
  description: "d", category: "Developer Tools", provider: "P", website: "https://x.io", docs: "https://x.io/docs", baseUrl: "https://x.io",
  pricing: "Free", auth: "No key", rateLimit: "", https: true, cors: "Unknown", beginner: true, verification: "Needs review",
  lastVerified: "", methods: ["GET"], responseFormat: "JSON", ...o,
});
const A = mk({ id: "a", name: "Alpha Weather", category: "Weather", description: "Forecast data" });
const B = mk({ id: "b", name: "Beta Pay", category: "Finance", pricing: "Paid", auth: "API key", beginner: false });
const C = mk({ id: "c", name: "Gamma", https: false, cors: "Yes", description: "weather alerts" });
const all = [A, B, C];

test("query tokens must all match and are case-insensitive", () => {
  assert.deepEqual(applyFilters(all, { ...DEFAULT_FILTERS, q: "WEATHER" }).map((a) => a.id), ["a", "c"]);
  assert.deepEqual(applyFilters(all, { ...DEFAULT_FILTERS, q: "weather alerts" }).map((a) => a.id), ["c"]);
  assert.ok(matchesQuery(A, "   "));
});

test("category, pricing, auth, https, cors filters", () => {
  assert.deepEqual(applyFilters(all, { ...DEFAULT_FILTERS, category: "Finance" }).map((a) => a.id), ["b"]);
  assert.deepEqual(applyFilters(all, { ...DEFAULT_FILTERS, pricing: "Paid" }).map((a) => a.id), ["b"]);
  assert.deepEqual(applyFilters(all, { ...DEFAULT_FILTERS, auth: "API key" }).map((a) => a.id), ["b"]);
  assert.deepEqual(applyFilters(all, { ...DEFAULT_FILTERS, https: "No" }).map((a) => a.id), ["c"]);
  assert.deepEqual(applyFilters(all, { ...DEFAULT_FILTERS, https: "Yes" }).map((a) => a.id), ["a", "b"]);
  assert.deepEqual(applyFilters(all, { ...DEFAULT_FILTERS, cors: "Yes" }).map((a) => a.id), ["c"]);
});

test("sorting: featured keeps catalog order, newest reverses, alphabetical, beginner", () => {
  assert.deepEqual(sortApis(all, "featured", all).map((a) => a.id), ["a", "b", "c"]);
  assert.deepEqual(sortApis(all, "newest", all).map((a) => a.id), ["c", "b", "a"]);
  assert.deepEqual(sortApis([C, A, B], "alphabetical", all).map((a) => a.id), ["a", "b", "c"]);
  assert.deepEqual(sortApis(all, "beginner", all).map((a) => a.id), ["a", "c", "b"]);
  assert.deepEqual(sortApis(all, "featured", all, "gamma").map((a) => a.id)[0], "c", "relevance first when searching");
});

test("pagination clamps and reports state", () => {
  const list = Array.from({ length: 50 }, (_, i) => i);
  const p1 = paginate(list, 1, 24);
  assert.equal(p1.items.length, 24); assert.equal(p1.totalPages, 3); assert.ok(p1.hasMore);
  const p3 = paginate(list, 99, 24);
  assert.equal(p3.page, 3); assert.equal(p3.items.length, 50); assert.ok(!p3.hasMore);
  assert.equal(paginate([], 1).totalPages, 1);
});

test("filters round-trip through URL params and omit defaults", () => {
  const f = { ...DEFAULT_FILTERS, q: "map", category: "Weather", sort: "alphabetical" as const, page: 2 };
  const qs = filtersToParams(f);
  assert.equal(qs.toString(), "q=map&category=Weather&sort=alphabetical&page=2");
  assert.deepEqual(parseFilters(qs), f);
  assert.equal(filtersToParams(DEFAULT_FILTERS).toString(), "");
});

test("parseFilters tolerates garbage", () => {
  const f = parseFilters(new URLSearchParams("sort=hax&page=-4&q=" + "x".repeat(500)));
  assert.equal(f.sort, "featured"); assert.equal(f.page, 1); assert.equal(f.q.length, 100);
  assert.equal(parseFilters(new URLSearchParams("page=abc")).page, 1);
});

test("suggest ranks name prefix above description matches", () => {
  const s = suggest(all, "gam");
  assert.equal(s[0].id, "c");
  assert.deepEqual(suggest(all, ""), []);
});

test("categoryCounts", () => {
  assert.equal(categoryCounts(all).get("Weather"), 1);
});
