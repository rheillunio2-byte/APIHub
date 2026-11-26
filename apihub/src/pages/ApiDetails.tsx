import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BookOpen, Code2, ExternalLink, GitCompare, Heart, Play } from "lucide-react";
import { apis, resolveApiId } from "../data/apis";
import { getFavorites, saveFavorites } from "../lib/storage";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useToast } from "../components/common/Toast";
import CodeSample from "../components/common/CodeSample";
import { generateSnippet } from "../lib/codegen.ts";

export default function ApiDetails() {
  const { id = "" } = useParams();
  const resolved = resolveApiId(id);
  const api = apis.find((a) => a.id === resolved);
  const [favorites, setFavorites] = useState(getFavorites);
  const toast = useToast();
  useDocumentTitle(api ? `${api.name} API` : "API not found", api ? `${api.name} by ${api.provider}: ${api.description} Authentication: ${api.auth}. Pricing: ${api.pricing}.` : undefined);

  // Structured data for search engines (schema.org). Only fields that exist in the catalog are emitted.
  useEffect(() => {
    if (!api) return;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "WebAPI", name: api.name, description: api.description, url: api.website, documentation: api.docs, provider: { "@type": "Organization", name: api.provider } }).replace(/</g, "\\u003c");
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [api]);

  if (!api) return <div className="page empty-state"><h1>API not found</h1><p>No catalog entry matches “{id}”.</p><Link className="btn-primary" to="/explore">Back to Explore</Link></div>;

  const saved = favorites.includes(api.id);
  const toggle = () => {
    const next = saved ? favorites.filter((x) => x !== api.id) : [...favorites, api.id];
    setFavorites(next); saveFavorites(next); toast(saved ? "Removed from favorites" : "Saved to favorites", "info");
  };
  const verified = api.verification === "Verified";
  const snippet = api.exampleEndpoint ? generateSnippet({ method: "GET", url: api.exampleEndpoint }, "cURL") : "";

  return (
    <div className="page">
      <Link to="/explore" className="back-link"><ArrowLeft size={15} aria-hidden="true" /> Back to Explore</Link>
      <article>
        <div className="detail-hero">
          <div className="api-icon detail-icon" aria-hidden="true">{api.name.slice(0, 1)}</div>
          <div className="detail-title">
            <div className="eyebrow">{api.category.toUpperCase()} · {api.provider}</div>
            <h1>{api.name}</h1><p>{api.description}</p>
            <div className="detail-tags"><span className="pill">{api.pricing}</span><span className="pill">{api.auth}</span><span className="pill">{api.https ? "HTTPS supported" : "HTTPS not confirmed"}</span><span className="pill">CORS: {api.cors}</span><span className={verified ? "pill status-reachable" : "pill pill-warn"}>{verified ? "Verified" : "Not verified"}</span></div>
          </div>
          <div className="detail-actions">
            <button className={saved ? "btn-secondary saved-action" : "btn-secondary"} onClick={toggle} aria-pressed={saved}><Heart size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />{saved ? "Saved" : "Favorite"}</button>
            <Link className="btn-primary" to={`/playground?url=${encodeURIComponent(api.exampleEndpoint || api.baseUrl)}`}><Play size={15} aria-hidden="true" /> Test API</Link>
          </div>
        </div>
        <div className="detail-columns">
          <div className="detail-main">
            <section className="content-panel"><div className="eyebrow">OVERVIEW</div><h2>About this API</h2>
              <p>{api.description} Visit the provider's official website and documentation for authoritative details, current usage conditions and supported endpoints.</p>
              <div className="info-grid"><div><span>Provider</span><strong>{api.provider}</strong></div><div><span>Category</span><strong>{api.category}</strong></div><div><span>Pricing classification</span><strong>{api.pricing}</strong></div><div><span>Authentication</span><strong>{api.auth}</strong></div><div><span>Rate limits</span><strong>{api.rateLimit}</strong></div><div><span>Catalog verification</span><strong>{api.verification}</strong></div></div>
            </section>
            <section className="content-panel"><div className="eyebrow">TECHNICAL DETAILS</div><h2>Connection information</h2>
              <div className="code-line"><span>Base URL</span><code>{api.baseUrl}</code></div>
              <div className="code-line"><span>Methods</span><code>{api.methods.join(", ")}</code></div>
              <div className="code-line"><span>Response format</span><code>{api.responseFormat}</code></div>
              <div className="code-line"><span>Last verified</span><code>{api.lastVerified}</code></div>
            </section>
            <section className="content-panel"><div className="eyebrow">EXAMPLE REQUEST</div><h2>Try an endpoint</h2>
              {api.exampleEndpoint ? <><code className="endpoint-code">{api.exampleEndpoint}</code><CodeSample code={snippet} label="cURL example" />
                <Link className="btn-primary inline-btn" to={`/playground?url=${encodeURIComponent(api.exampleEndpoint)}`}><Play size={15} aria-hidden="true" /> Open in Playground</Link></>
                : <p>No public example endpoint is recorded for this API. Check the official documentation before constructing a request.</p>}
            </section>
          </div>
          <aside className="detail-side">
            <div className="content-panel"><div className="eyebrow">OFFICIAL RESOURCES</div>
              <a className="resource-link" href={api.website} target="_blank" rel="noreferrer noopener"><ExternalLink size={16} aria-hidden="true" /> Official website <ArrowUpRight size={14} aria-hidden="true" /></a>
              <a className="resource-link" href={api.docs} target="_blank" rel="noreferrer noopener"><BookOpen size={16} aria-hidden="true" /> Documentation <ArrowUpRight size={14} aria-hidden="true" /></a></div>
            <div className="notice-panel"><strong>{verified ? "Verified record" : "Verification notice"}</strong>
              <p>{verified ? `Last verified ${api.lastVerified}.` : "This catalog record has not been recently verified. Pricing, limits, CORS and terms can change. Confirm details with the provider before production use."}</p></div>
            <Link to={`/generator?api=${api.id}`} className="btn-secondary full-btn"><Code2 size={16} aria-hidden="true" /> Generate integration code</Link>
            <Link to={`/compare?ids=${api.id}`} className="btn-secondary full-btn"><GitCompare size={16} aria-hidden="true" /> Compare with others</Link>
          </aside>
        </div>
      </article>
    </div>
  );
}
