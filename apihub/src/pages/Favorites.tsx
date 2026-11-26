import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Search } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import ApiCard from "../components/common/ApiCard";
import { apis } from "../data/apis";
import { matchesQuery } from "../lib/catalog.ts";
import { getFavorites, saveFavorites } from "../lib/storage";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useToast } from "../components/common/Toast";

export default function Favorites() {
  useDocumentTitle("Favorites", "Your saved APIs, stored in this browser.");
  const [ids, setIds] = useState(getFavorites);
  const [q, setQ] = useState("");
  const toast = useToast();
  const saved = apis.filter((a) => ids.includes(a.id));
  const items = saved.filter((a) => matchesQuery(a, q));
  const remove = (id: string) => { const next = ids.filter((x) => x !== id); setIds(next); saveFavorites(next); toast("Removed from favorites", "info"); };

  return (
    <div className="page">
      <PageHeader eyebrow="YOUR WORKSPACE" title="Favorites" description="A quick-access list of the APIs you've saved. Stored in this browser only." />
      {saved.length > 0 && (
        <div className="explore-toolbar">
          <div className="search-field"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Search saved APIs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search saved APIs…" /></div>
          <div className="result-count" role="status">{items.length} of {saved.length} saved</div>
        </div>
      )}
      {items.length ? (
        <div className="api-grid">{items.map((a) => <ApiCard key={a.id} api={a} favorite onFavorite={() => remove(a.id)} />)}</div>
      ) : (
        <div className="empty-state">
          <Heart size={28} aria-hidden="true" />
          <h3>{saved.length ? "No saved APIs match your search" : "No favorites yet"}</h3>
          <p>{saved.length ? "Try a different search term." : "Tap the heart on any API to keep it here."}</p>
          {!saved.length && <Link className="btn-primary" to="/explore">Browse APIs</Link>}
        </div>
      )}
    </div>
  );
}
