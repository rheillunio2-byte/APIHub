import { useState } from "react";
import { RefreshCw } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import { apis } from "../data/apis";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { isProxyConfigured, sendRequest } from "../lib/proxyClient.ts";
import { classifyCheck, type CheckResult } from "../lib/verification.ts";
import { validateTargetUrl } from "../lib/urlSafety.ts";

const config = { supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined };
type Row = (CheckResult & { at: string }) | "checking";
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
// Endpoints that need a credential or a placeholder can't be checked honestly without one.
const needsPlaceholder = (u: string) => /YOUR_|ACXXXXX|<|>/.test(u);

export default function ApiStatus() {
  useDocumentTitle("API Status", "Run manual, honest reachability checks against catalog example endpoints. Reachable, unavailable, verification failed and untested are kept distinct.");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const mode = isProxyConfigured(config) ? "proxy" : "direct";

  const check = async (id: string, url: string) => {
    setRows((r) => ({ ...r, [id]: "checking" }));
    const res = await sendRequest({ method: "GET", url, headers: { Accept: "application/json" }, mode }, config);
    const result = classifyCheck({ statusCode: res.status, failure: res.failure });
    setRows((r) => ({ ...r, [id]: { ...result, at: new Date().toLocaleTimeString() } }));
  };

  return (
    <div className="page">
      <PageHeader eyebrow="RELIABILITY" title="API Status" description="Manual, single-request checks. One check is not proof of provider uptime." />
      <div className="notice-panel wide-notice">
        <strong>What these states mean</strong>
        <p><b>Reachable</b>: the endpoint answered an HTTP request (it says nothing about correctness). <b>Unavailable</b>: the host failed, timed out or returned 5xx/404. <b>Verification failed</b>: the check itself was blocked (for example by browser CORS), which is not evidence the API is down. <b>Untested</b>: no check has run. Checks run {mode === "proxy" ? "through the APIHub proxy" : "directly from your browser, so CORS will block many providers"}. A loaded documentation page is never counted as an operational API.</p>
      </div>
      <div className="content-panel status-table">
        <div className="table-head"><span>API / PROVIDER</span><span>CATALOG REVIEW</span><span>ENDPOINT CHECK</span><span>ACTION</span></div>
        {apis.map((a) => {
          const row = rows[a.id];
          const state = row === "checking" ? null : row;
          const target = a.exampleEndpoint;
          const checkable = !!target && !needsPlaceholder(target) && validateTargetUrl(target).ok;
          return (
            <div className="table-row" key={a.id}>
              <div><strong>{a.name}</strong><small>{a.provider}</small></div>
              <span className="pill">{a.verification}</span>
              <span className="status-result" aria-live="polite">
                {row === "checking" ? "Checking…" : state
                  ? <><span className={`pill status-${slug(state.status)}`}>{state.status}</span> {state.detail} <small>{state.at}</small></>
                  : <span className="pill status-untested">Untested</span>}
                {!checkable && !state && <small> {target ? "Needs credentials" : "No example endpoint"}</small>}
              </span>
              <button className="quiet-button" disabled={!checkable || row === "checking"} onClick={() => check(a.id, target!)} aria-label={`Check ${a.name}`}><RefreshCw size={13} aria-hidden="true" /> Check</button>
            </div>
          );
        })}
      </div>
      <p className="muted-small">Results live only in this tab and are not stored or presented as provider-wide uptime.</p>
    </div>
  );
}
