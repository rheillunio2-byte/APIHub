import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ExternalLink, Plus, X } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import { apis, resolveApiId } from "../data/apis";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { ApiRecord } from "../types";

const MAX = 4;
const link = (href: string, label: string) => <a className="resource-link inline" href={href} target="_blank" rel="noreferrer noopener">{label} <ExternalLink size={12} aria-hidden="true" /></a>;
const ROWS: Array<[string, (a: ApiRecord) => React.ReactNode]> = [
  ["Category", (a) => a.category],
  ["Provider", (a) => a.provider],
  ["Authentication", (a) => a.auth],
  ["Pricing model", (a) => a.pricing],
  ["HTTPS", (a) => (a.https ? "Yes" : "Not confirmed")],
  ["CORS", (a) => a.cors],
  ["HTTP methods", (a) => a.methods.join(", ")],
  ["Base URL", (a) => <code>{a.baseUrl}</code>],
  ["Documentation", (a) => (a.docs ? link(a.docs, "Docs") : "Not listed")],
  ["Website", (a) => link(a.website, "Website")],
  ["Catalog review", (a) => a.verification],
  ["Last verified", (a) => (a.lastVerified === "Not recently verified" ? "Not verified" : a.lastVerified)],
];

export default function Compare() {
  useDocumentTitle("Compare APIs", "Compare public APIs side by side: authentication, pricing model, HTTPS, CORS, documentation and verification status.");
  const [params, setParams] = useSearchParams();
  const selected = useMemo(() => {
    const ids = (params.get("ids") ?? "").split(",").map((s) => resolveApiId(s.trim())).filter(Boolean) as string[];
    return [...new Set(ids)].slice(0, MAX).map((id) => apis.find((a) => a.id === id)).filter((a): a is ApiRecord => !!a);
  }, [params]);
  const setIds = (ids: string[]) => setParams(ids.length ? { ids: ids.join(",") } : {}, { replace: true });
  const options = apis.filter((a) => !selected.some((s) => s.id === a.id)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <PageHeader eyebrow="DECIDE FASTER" title="Compare APIs" description={`Put up to ${MAX} APIs side by side. Values come straight from the catalog – no benchmarks, uptime or pricing figures are invented.`} />
      <div className="compare-picker content-panel">
        <label>Add an API
          <select value="" disabled={selected.length >= MAX} onChange={(e) => e.target.value && setIds([...selected.map((s) => s.id), e.target.value])}>
            <option value="">{selected.length >= MAX ? `Maximum of ${MAX} reached` : "Choose an API…"}</option>
            {options.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.category}</option>)}
          </select></label>
        <span className="muted-small">{selected.length} of {MAX} selected</span>
      </div>
      {selected.length < 2 ? (
        <div className="empty-state"><Plus size={28} aria-hidden="true" /><h3>{selected.length ? "Add one more API to compare" : "Pick APIs to compare"}</h3><p>Choose at least two APIs above, or open <Link to="/explore">Explore</Link> and compare from an API's page.</p></div>
      ) : (
        <div className="table-scroll content-panel">
          <table className="compare-table">
            <caption className="sr-only">Comparison of {selected.map((a) => a.name).join(", ")}</caption>
            <thead><tr><th scope="col"><span className="sr-only">Attribute</span></th>{selected.map((a) => (
              <th scope="col" key={a.id}><Link to={`/api/${a.id}`}>{a.name}</Link>
                <button className="icon-button" aria-label={`Remove ${a.name} from comparison`} onClick={() => setIds(selected.filter((s) => s.id !== a.id).map((s) => s.id))}><X size={14} aria-hidden="true" /></button></th>))}</tr></thead>
            <tbody>{ROWS.map(([label, get]) => <tr key={label}><th scope="row">{label}</th>{selected.map((a) => <td key={a.id}>{get(a)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      <p className="muted-small">“Catalog review” and “Last verified” describe APIHub's own records, not live provider status. Confirm pricing, limits and terms with each provider.</p>
    </div>
  );
}
