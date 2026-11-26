import { useMemo } from "react";
import { tokenizeJson } from "../../lib/jsonHighlight.ts";

/** Syntax-highlighted, read-only code view. Tokens are rendered as text nodes (never as HTML). */
export default function JsonView({ text, label }: { text: string; label: string }) {
  const tokens = useMemo(() => (text.length > 200_000 ? null : tokenizeJson(text)), [text]);
  return (
    <pre className="code-block json-view" tabIndex={0} aria-label={label}>
      <code>{tokens ? tokens.map((t, i) => <span key={i} className={`tok-${t.type}`}>{t.text}</span>) : text}</code>
    </pre>
  );
}
