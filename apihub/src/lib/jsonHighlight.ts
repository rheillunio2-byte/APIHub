// Tiny JSON tokenizer for syntax highlighting. Produces plain tokens – the UI renders them as
// React text nodes, so response content is never injected as HTML.
export type TokenType = "key" | "string" | "number" | "boolean" | "null" | "punct" | "space";
export interface Token { type: TokenType; text: string }

const RE = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}\[\],:])|(\s+)/g;

export function tokenizeJson(src: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of src.matchAll(RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: "punct", text: src.slice(last, i) });
    if (m[1] !== undefined) {
      if (m[2] !== undefined) { out.push({ type: "key", text: m[1] }); out.push({ type: "punct", text: m[2] }); }
      else out.push({ type: "string", text: m[1] });
    } else if (m[3] !== undefined) out.push({ type: "number", text: m[3] });
    else if (m[4] !== undefined) out.push({ type: "boolean", text: m[4] });
    else if (m[5] !== undefined) out.push({ type: "null", text: m[5] });
    else if (m[6] !== undefined) out.push({ type: "punct", text: m[6] });
    else out.push({ type: "space", text: m[7] });
    last = i + m[0].length;
  }
  if (last < src.length) out.push({ type: "punct", text: src.slice(last) });
  return out;
}

/** Pretty-print when the text is valid JSON; otherwise return it untouched. */
export function formatJson(text: string): { formatted: string; isJson: boolean } {
  try { return { formatted: JSON.stringify(JSON.parse(text), null, 2), isJson: true }; } catch { return { formatted: text, isJson: false }; }
}
