import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Download, RotateCcw } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import { apis } from "../data/apis";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useCopy } from "../components/common/Toast";
import { FILE_EXTENSION, generateSnippet, LANGUAGES, type Language } from "../lib/codegen.ts";

export default function CodeGenerator() {
  useDocumentTitle("Code Generator", "Generate JavaScript, TypeScript, Python, PHP, cURL and React request snippets for any API in the catalog.");
  const [params] = useSearchParams();
  const copy = useCopy();
  const initial = apis.find((a) => a.id === params.get("api")) ?? apis.find((a) => a.id === "jsonplaceholder") ?? apis[0];
  const [apiId, setApiId] = useState(initial.id);
  const api = apis.find((a) => a.id === apiId) ?? initial;
  const [language, setLanguage] = useState<Language>("JavaScript");
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState(initial.exampleEndpoint || initial.baseUrl);
  const [body, setBody] = useState('{\n  "name": "example"\n}');
  const needsKey = api.auth === "API key" || api.auth === "OAuth";
  const hasBody = method !== "GET";
  const headers: Record<string, string> = {};
  const code = useMemo(() => generateSnippet({ method, url: endpoint, headers, body: hasBody ? body : undefined }, language), [method, endpoint, headers, body, hasBody, language]);

  const pick = (id: string) => { const a = apis.find((x) => x.id === id); setApiId(id); setEndpoint(a?.exampleEndpoint || a?.baseUrl || ""); setMethod("GET"); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = `apihub-example.${FILE_EXTENSION[language]}`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <PageHeader eyebrow="DEVELOPER TOOLS" title="Code Generator" description="Generate adaptable request examples. Credentials are always replaced by placeholders." />
      <div className="generator-layout">
        <section className="content-panel generator-config">
          <div className="eyebrow">CONFIGURATION</div><h2>Build your snippet</h2>
          <label>API<select value={apiId} onChange={(e) => pick(e.target.value)}>{apis.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label>Endpoint URL<input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} spellCheck={false} /></label>
          <label>HTTP method<select value={method} onChange={(e) => setMethod(e.target.value)}>{api.methods.map((m) => <option key={m}>{m}</option>)}</select></label>
          {hasBody && <label>Request body<textarea className="mono" rows={5} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} /></label>}
          <label>Language<select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select></label>
          <div className="notice-panel"><strong>Security reminder</strong>
            <p>{needsKey ? "This API needs credentials. The snippet uses a placeholder: load your real key from an environment variable on a server, never from front-end code." : "This API is listed as not needing a key. Still confirm current terms with the provider."}</p></div>
        </section>
        <section className="content-panel code-preview">
          <div className="panel-heading"><div><div className="eyebrow">{language.toUpperCase()} · GENERATED EXAMPLE</div><h2>Integration snippet</h2></div>
            <div className="response-actions">
              <button className="icon-button" onClick={() => copy(code, "Code copied")} aria-label="Copy code"><Copy size={15} /></button>
              <button className="icon-button" onClick={download} aria-label="Download code"><Download size={15} /></button>
              <button className="icon-button" onClick={() => { setLanguage("JavaScript"); pick(api.id); }} aria-label="Reset"><RotateCcw size={15} /></button>
            </div></div>
          <pre className="code-block" tabIndex={0} aria-label="Generated code"><code>{code}</code></pre>
        </section>
      </div>
    </div>
  );
}
