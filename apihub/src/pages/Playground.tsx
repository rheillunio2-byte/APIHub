import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Copy, History, Info, Loader2, Play, Plus, Trash2, X } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import JsonView from "../components/common/JsonView";
import CodeSample from "../components/common/CodeSample";
import { useCopy, useToast } from "../components/common/Toast";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { isProxyConfigured, sendRequest, type Mode, type SendResult } from "../lib/proxyClient.ts";
import { formatJson } from "../lib/jsonHighlight.ts";
import { generateSnippet, type Language } from "../lib/codegen.ts";
import { addHistory, makeEntry, parseHistory, restorableBody, restorableHeaders, type HistoryEntry } from "../lib/history.ts";
import { getHistoryRaw, saveHistoryRaw } from "../lib/storage.ts";
import { validateTargetUrl } from "../lib/urlSafety.ts";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const SNIPPET_LANGS: Language[] = ["JavaScript", "Python", "cURL"];
const config = { supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined };
const proxyAvailable = isProxyConfigured(config);

interface Param { key: string; value: string }

/** Merge the params table into the URL's query string (params from the table win over duplicates). */
function withParams(url: string, params: Param[]): string {
  const active = params.filter((p) => p.key.trim());
  if (!active.length) return url;
  try {
    const u = new URL(url);
    for (const p of active) u.searchParams.set(p.key.trim(), p.value);
    return u.toString();
  } catch { return url; }
}

function parseHeaders(text: string): { ok: true; headers: Record<string, string> } | { ok: false; error: string } {
  if (!text.trim()) return { ok: true, headers: {} };
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "Headers must be a JSON object, e.g. {\"Accept\": \"application/json\"}." };
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v)) { if (typeof val !== "string") return { ok: false, error: `Header "${k}" must be a string.` }; out[k] = val; }
    return { ok: true, headers: out };
  } catch { return { ok: false, error: "Headers are not valid JSON." }; }
}

export default function Playground() {
  useDocumentTitle("API Playground", "Send GET, POST, PUT, PATCH and DELETE requests to public APIs, inspect responses, and copy ready-to-use code.");
  const [search] = useSearchParams();
  const toast = useToast();
  const copy = useCopy();

  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState(() => { const u = search.get("url"); return u && validateTargetUrl(u).ok ? u : "https://jsonplaceholder.typicode.com/posts/1"; });
  const [params, setParams] = useState<Param[]>([]);
  const [headersText, setHeadersText] = useState('{\n  "Accept": "application/json"\n}');
  const [body, setBody] = useState('{\n  "title": "hello",\n  "body": "world",\n  "userId": 1\n}');
  const [mode, setMode] = useState<Mode>("direct");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [tab, setTab] = useState<"response" | "headers" | "code">("response");
  const [lang, setLang] = useState<Language>("JavaScript");
  const [history, setHistory] = useState<HistoryEntry[]>(() => parseHistory(getHistoryRaw()));

  const hasBody = method !== "GET";
  const parsedHeaders = useMemo(() => parseHeaders(headersText), [headersText]);
  const fullUrl = useMemo(() => withParams(url.trim(), params), [url, params]);
  const urlCheck = useMemo(() => (url.trim() ? validateTargetUrl(fullUrl) : null), [url, fullUrl]);
  const bodyIsJson = !body.trim() || formatJson(body).isJson;
  const canSend = !loading && !!urlCheck?.ok && parsedHeaders.ok;
  const looksSensitive = parsedHeaders.ok && Object.keys(parsedHeaders.headers).some((h) => /^(authorization|x-api-key|api-key|cookie)$/i.test(h));

  const send = async () => {
    if (!canSend || !parsedHeaders.ok) return;
    setLoading(true); setResult(null); setTab("response");
    const input = { method, url: fullUrl, headers: parsedHeaders.headers, body: hasBody ? body : undefined };
    const res = await sendRequest({ ...input, mode }, config);
    setResult(res); setLoading(false);
    const next = addHistory(history, makeEntry({ ...input, status: res.status, elapsedMs: res.elapsedMs }));
    setHistory(next); saveHistoryRaw(next); // credentials are redacted before they are persisted
  };

  const restore = (e: HistoryEntry) => {
    setMethod(e.method); setUrl(e.url); setParams([]);
    const h = restorableHeaders(e.headers); setHeadersText(JSON.stringify(h, null, 2));
    const b = restorableBody(e.body); if (b) setBody(b);
    toast("Request restored (credentials are never saved)", "info");
  };
  const clearHistory = () => { if (window.confirm("Clear all saved request history?")) { setHistory([]); saveHistoryRaw([]); toast("History cleared", "info"); } };

  const responseText = result?.ok ? formatJson(result.body).formatted : "";
  const snippet = generateSnippet({ method, url: fullUrl || url, headers: parsedHeaders.ok ? parsedHeaders.headers : {}, body: hasBody ? body : undefined }, lang);
  const statusClass = result?.ok && result.status ? (result.status < 400 ? "status-reachable" : "status-unavailable") : "";

  return (
    <div className="page">
      <PageHeader eyebrow="DEVELOPER TOOLS" title="API Playground" description="Send real HTTP requests to public APIs, inspect the response and copy code for your project." />
      <div className="playground-grid">
        <section className="content-panel request-panel" aria-labelledby="req-h">
          <div className="panel-heading"><div><div className="eyebrow">REQUEST BUILDER</div><h2 id="req-h">Configure request</h2></div>
            <button className="quiet-button" onClick={() => { setUrl(""); setResult(null); setParams([]); }}><Trash2 size={14} aria-hidden="true" /> Clear</button></div>

          <fieldset className="mode-switch">
            <legend>SEND VIA</legend>
            <label><input type="radio" name="mode" checked={mode === "direct"} onChange={() => setMode("direct")} /> Browser (CORS applies)</label>
            <label className={proxyAvailable ? "" : "disabled"} title={proxyAvailable ? "" : "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and deploy the secure-proxy function"}>
              <input type="radio" name="mode" checked={mode === "proxy"} disabled={!proxyAvailable} onChange={() => setMode("proxy")} /> APIHub proxy{proxyAvailable ? "" : " (not configured)"}
            </label>
          </fieldset>

          <label>Request URL
            <div className="url-row">
              <select aria-label="HTTP method" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/endpoint" spellCheck={false} aria-invalid={urlCheck ? !urlCheck.ok : undefined} aria-describedby="url-err" />
            </div>
          </label>
          <div id="url-err" className="field-error" role="alert">{urlCheck && !urlCheck.ok ? urlCheck.reason : ""}</div>

          <div className="params">
            <div className="params-head"><span className="muted-small">QUERY PARAMETERS</span><button className="quiet-button" onClick={() => setParams([...params, { key: "", value: "" }])}><Plus size={13} aria-hidden="true" /> Add</button></div>
            {params.map((p, i) => (
              <div className="param-row" key={i}>
                <input aria-label={`Parameter ${i + 1} name`} placeholder="name" value={p.key} onChange={(e) => setParams(params.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                <input aria-label={`Parameter ${i + 1} value`} placeholder="value" value={p.value} onChange={(e) => setParams(params.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <button className="icon-button" aria-label={`Remove parameter ${i + 1}`} onClick={() => setParams(params.filter((_, j) => j !== i))}><X size={14} /></button>
              </div>
            ))}
          </div>

          <label>Headers <span className="muted-small">JSON object</span>
            <textarea className="mono editor-input" rows={4} value={headersText} onChange={(e) => setHeadersText(e.target.value)} spellCheck={false} />
          </label>
          {!parsedHeaders.ok && <div className="field-error" role="alert">{parsedHeaders.error}</div>}
          {looksSensitive && <div className="notice-inline"><AlertTriangle size={15} aria-hidden="true" /> This request includes a credential header. It is sent, but never saved to history, and replaced with a placeholder in generated code.</div>}

          {hasBody && (
            <label>Request body
              <textarea className="mono editor-input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} />
              {!bodyIsJson && <span className="field-error">Body is not valid JSON. It will be sent as-is.</span>}
            </label>
          )}

          <button className="btn-primary send-btn" disabled={!canSend} onClick={send}>
            {loading ? <><Loader2 size={15} className="spin" aria-hidden="true" /> Sending…</> : <><Play size={15} aria-hidden="true" /> Send request</>}
          </button>
          <div className="security-note"><Info size={15} aria-hidden="true" /> Requests to localhost, private networks and cloud metadata addresses are blocked. Don't paste private API keys into any browser tool you don't control.</div>
        </section>

        <section className="content-panel response-panel" aria-labelledby="res-h" aria-busy={loading}>
          <div className="panel-heading"><div><div className="eyebrow">RESULT</div><h2 id="res-h">Response</h2></div>
            <div className="response-actions">
              <button className="quiet-button" disabled={!result?.ok} onClick={() => copy(responseText, "Response copied")}><Copy size={14} aria-hidden="true" /> Response</button>
              <button className="quiet-button" onClick={() => copy(snippet, "Request code copied")}><Copy size={14} aria-hidden="true" /> Request</button>
            </div></div>
          <div className="response-meta">
            <span className={`pill ${statusClass}`}>{result?.ok ? `HTTP ${result.status} ${result.statusText ?? ""}` : "—"}</span>
            <span className="pill">{result ? `${result.elapsedMs} ms` : "No request yet"}</span>
            {result?.truncated && <span className="pill pill-warn">Truncated</span>}
          </div>
          <div className="tabs" role="tablist">
            {(["response", "headers", "code"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>{t === "code" ? "Code" : t[0].toUpperCase() + t.slice(1)}</button>)}
          </div>
          {tab === "code" ? (
            <>
              <div className="lang-row" role="group" aria-label="Language">{SNIPPET_LANGS.map((l) => <button key={l} className={lang === l ? "chip active" : "chip"} onClick={() => setLang(l)}>{l === "JavaScript" ? "JavaScript (fetch)" : l === "Python" ? "Python (requests)" : "cURL"}</button>)}</div>
              <CodeSample code={snippet} label={`${lang} request`} />
            </>
          ) : loading ? (
            <div className="skeleton-block" role="status"><div className="skeleton" /><div className="skeleton short" /><div className="skeleton" /><span className="sr-only">Waiting for response…</span></div>
          ) : result && !result.ok ? (
            <div className="error-state" role="alert"><AlertTriangle size={18} aria-hidden="true" /><div><strong>{result.failure === "blocked" ? "Request blocked" : "Request failed"}</strong><p>{result.error}</p></div></div>
          ) : result ? (
            tab === "headers"
              ? <JsonView text={JSON.stringify(result.headers, null, 2)} label="Response headers" />
              : <>{result.dropped?.length ? <div className="notice-inline"><Info size={15} aria-hidden="true" /> Headers not forwarded by the proxy: {result.dropped.join(", ")}</div> : null}<JsonView text={responseText || "(empty body)"} label="Response body" /></>
          ) : (
            <div className="empty-state compact"><Play size={22} aria-hidden="true" /><h3>Ready when you are</h3><p>Configure a request and press Send to see the real server response.</p></div>
          )}
        </section>
      </div>

      <section className="content-panel history-panel" aria-labelledby="hist-h">
        <div className="panel-heading"><div><div className="eyebrow">LOCAL HISTORY</div><h2 id="hist-h"><History size={15} aria-hidden="true" /> Recent requests</h2></div>
          {history.length > 0 && <button className="quiet-button danger" onClick={clearHistory}><Trash2 size={14} aria-hidden="true" /> Clear history</button>}</div>
        {history.length ? (
          <ul className="history-list">{history.map((h) => <li key={h.id}><button onClick={() => restore(h)}><span className="pill">{h.method}</span><code>{h.url}</code><small>{h.status ?? "—"}{h.elapsedMs != null ? ` · ${h.elapsedMs} ms` : ""}</small></button></li>)}</ul>
        ) : <p className="muted-small">Requests you send appear here. Credentials are redacted before anything is saved to this browser.</p>}
      </section>
    </div>
  );
}
