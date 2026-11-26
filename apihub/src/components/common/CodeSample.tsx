import { Copy } from "lucide-react";
import { useCopy } from "./Toast";

export default function CodeSample({ code, label }: { code: string; label: string }) {
  const copy = useCopy();
  return (
    <div className="code-sample">
      <button className="icon-button" aria-label={`Copy ${label}`} onClick={() => copy(code, "Code copied")}><Copy size={14} aria-hidden="true" /></button>
      <pre className="code-block" tabIndex={0} aria-label={label}><code>{code}</code></pre>
    </div>
  );
}
