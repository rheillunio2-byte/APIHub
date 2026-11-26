import type { ApiRecord } from "../types/index.ts";

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured (curated order)" },
  { value: "newest", label: "Recently added to catalog" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "beginner", label: "Beginner-friendly first" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export interface Filters {
  q: string; category: string; pricing: string; auth: string; https: string; cors: string; sort: SortKey; page: number;
}

export const ALL_CATEGORIES = "All categories";
export const PAGE_SIZE = 24;

export const DEFAULT_FILTERS: Filters = {
  q: "", category: ALL_CATEGORIES, pricing: "All pricing", auth: "All auth", https: "Any", cors: "Any", sort: "featured", page: 1,
};

const isSort = (v: string | null): v is SortKey => SORT_OPTIONS.some((o) => o.value === v);

/** Read filters from a URL query string. Unknown values fall back to defaults. */
export function parseFilters(params: URLSearchParams): Filters {
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  const sort = params.get("sort");
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    category: params.get("category") || DEFAULT_FILTERS.category,
    pricing: params.get("pricing") || DEFAULT_FILTERS.pricing,
    auth: params.get("auth") || DEFAULT_FILTERS.auth,
    https: params.get("https") || DEFAULT_FILTERS.https,
    cors: params.get("cors") || DEFAULT_FILTERS.cors,
    sort: isSort(sort) ? sort : DEFAULT_FILTERS.sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Serialise filters, omitting defaults so URLs stay short and shareable. */
export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).forEach((k) => {
    if (f[k] !== DEFAULT_FILTERS[k]) p.set(k, String(f[k]));
  });
  return p;
}

const haystack = (a: ApiRecord) => `${a.name} ${a.description} ${a.category} ${a.provider} ${a.id}`.toLowerCase();

/** Every whitespace-separated token must appear somewhere in the record. */
export function matchesQuery(a: ApiRecord, q: string): boolean {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const h = haystack(a);
  return tokens.every((t) => h.includes(t));
}

/** Higher = better. Used to order search suggestions and relevance. */
export function relevance(a: ApiRecord, q: string): number {
  const query = q.trim().toLowerCase();
  if (!query) return 0;
  const name = a.name.toLowerCase();
  if (name === query) return 100;
  if (name.startsWith(query)) return 80;
  if (name.includes(query)) return 60;
  if (a.provider.toLowerCase().includes(query)) return 40;
  if (a.category.toLowerCase().includes(query)) return 30;
  return matchesQuery(a, q) ? 10 : 0;
}

export function applyFilters(apis: ApiRecord[], f: Filters): ApiRecord[] {
  return apis.filter((a) =>
    matchesQuery(a, f.q) &&
    (f.category === ALL_CATEGORIES || a.category === f.category) &&
    (f.pricing === DEFAULT_FILTERS.pricing || a.pricing === f.pricing) &&
    (f.auth === DEFAULT_FILTERS.auth || a.auth === f.auth) &&
    (f.https === "Any" || (f.https === "Yes" ? a.https : !a.https)) &&
    (f.cors === "Any" || a.cors === f.cors));
}

/**
 * Sorting never reorders by invented signals. "Recently added" uses the catalog's own
 * insertion order (later entries were added later); the catalog stores no per-record
 * timestamps, so this is the only honest recency signal available.
 */
export function sortApis(list: ApiRecord[], sort: SortKey, catalog: ApiRecord[], q = ""): ApiRecord[] {
  const order = new Map(catalog.map((a, i) => [a.id, i]));
  const idx = (a: ApiRecord) => order.get(a.id) ?? 0;
  const out = [...list];
  switch (sort) {
    case "alphabetical": return out.sort((a, b) => a.name.localeCompare(b.name));
    case "newest": return out.sort((a, b) => idx(b) - idx(a));
    case "beginner": return out.sort((a, b) => Number(b.beginner) - Number(a.beginner) || idx(a) - idx(b));
    default:
      return q.trim()
        ? out.sort((a, b) => relevance(b, q) - relevance(a, q) || idx(a) - idx(b))
        : out.sort((a, b) => idx(a) - idx(b));
  }
}

export function paginate<T>(list: T[], page: number, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  return { items: list.slice(0, current * size), page: current, totalPages, total: list.length, hasMore: current < totalPages };
}

export function suggest(apis: ApiRecord[], q: string, limit = 6): ApiRecord[] {
  if (!q.trim()) return [];
  return apis.map((a) => [a, relevance(a, q)] as const).filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, limit).map(([a]) => a);
}

export function categoryCounts(apis: ApiRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of apis) m.set(a.category, (m.get(a.category) ?? 0) + 1);
  return m;
}
