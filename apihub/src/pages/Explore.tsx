import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GitCompare, Search, SlidersHorizontal, X } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import ApiCard from "../components/common/ApiCard";
import { apis, categories } from "../data/apis";
import { applyFilters, ALL_CATEGORIES, DEFAULT_FILTERS, filtersToParams, paginate, parseFilters, SORT_OPTIONS, sortApis, type Filters } from "../lib/catalog.ts";
import { getFavorites, saveFavorites } from "../lib/storage";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useToast } from "../components/common/Toast";

const PRICING = ["All pricing", "Free", "Freemium", "Paid", "Free trial"];
const AUTH = ["All auth", "No key", "API key", "OAuth", "Other"];

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const [favorites, setFavorites] = useState(getFavorites);
  const [compare, setCompare] = useState<string[]>([]);
  const toast = useToast();
  useDocumentTitle(
    filters.category !== ALL_CATEGORIES ? `${filters.category} APIs` : "Explore APIs",
    "Search and filter a catalog of public APIs by category, authentication, pricing, HTTPS and CORS support.",
  );

  // Filters live in the URL, so every search is shareable and the back button works.
  const update = (patch: Partial<Filters>) => setParams(filtersToParams({ ...filters, page: 1, ...patch }), { replace: true });
  const clear = () => setParams({}, { replace: true });

  const filtered = useMemo(() => sortApis(applyFilters(apis, filters), filters.sort, apis, filters.q), [filters]);
  const view = paginate(filtered, filters.page);
  const hasFilters = filtersToParams({ ...filters, sort: DEFAULT_FILTERS.sort, page: 1 }).toString() !== "";

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
    setFavorites(next); saveFavorites(next);
    toast(favorites.includes(id) ? "Removed from favorites" : "Saved to favorites", "info");
  };
  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 4 ? [...c, id] : c));

  return (
    <div className="page">
      <PageHeader eyebrow="API DIRECTORY" title="Explore APIs" description="Search, filter and evaluate APIs for your next build." />
      <div className="explore-toolbar">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input type="search" aria-label="Search APIs" value={filters.q} onChange={(e) => update({ q: e.target.value })} placeholder="Search by name, description, provider or category…" />
        </div>
        <div className="result-count" role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? "API" : "APIs"} found</div>
      </div>
      <div className="filter-panel">
        <div className="filter-title"><SlidersHorizontal size={15} aria-hidden="true" /> FILTERS {hasFilters && <button onClick={clear}>Clear all <X size={13} aria-hidden="true" /></button>}</div>
        <div className="filter-controls">
          <label>Category<select value={filters.category} onChange={(e) => update({ category: e.target.value })}><option>{ALL_CATEGORIES}</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Pricing<select value={filters.pricing} onChange={(e) => update({ pricing: e.target.value })}>{PRICING.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Authentication<select value={filters.auth} onChange={(e) => update({ auth: e.target.value })}>{AUTH.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>HTTPS<select value={filters.https} onChange={(e) => update({ https: e.target.value })}><option>Any</option><option>Yes</option><option>No</option></select></label>
          <label>CORS<select value={filters.cors} onChange={(e) => update({ cors: e.target.value })}>{["Any", "Yes", "No", "Unknown"].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Sort by<select value={filters.sort} onChange={(e) => update({ sort: e.target.value as Filters["sort"] })}>{SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        </div>
      </div>

      {compare.length > 0 && (
        <div className="notice-inline" role="status">
          <GitCompare size={15} aria-hidden="true" /> {compare.length} selected for comparison.
          <Link className="text-link" to={`/compare?ids=${compare.join(",")}`}>Compare now</Link>
          <button className="quiet-button" onClick={() => setCompare([])}>Clear</button>
        </div>
      )}

      {view.items.length ? (
        <>
          <div className="api-grid">
            {view.items.map((a) => (
              <div key={a.id}>
                <ApiCard api={a} favorite={favorites.includes(a.id)} onFavorite={() => toggleFavorite(a.id)} />
                <label className="check muted-small"><input type="checkbox" checked={compare.includes(a.id)} onChange={() => toggleCompare(a.id)} disabled={!compare.includes(a.id) && compare.length >= 4} /> Add {a.name} to compare</label>
              </div>
            ))}
          </div>
          <div className="load-more">
            <span className="muted-small">Showing {view.items.length} of {view.total}</span>
            {view.hasMore && <button className="btn-secondary" onClick={() => update({ page: view.page + 1 })}>Load more</button>}
          </div>
        </>
      ) : (
        <div className="empty-state"><Search size={28} aria-hidden="true" /><h3>No APIs match those filters</h3><p>Try a different search or clear some filters.</p><button className="btn-secondary" onClick={clear}>Clear filters</button></div>
      )}
    </div>
  );
}
