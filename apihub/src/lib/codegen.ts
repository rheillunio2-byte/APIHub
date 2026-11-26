// Request → code snippet generation. Pure functions, no DOM.

export const LANGUAGES = ["JavaScript", "TypeScript", "Python", "PHP", "cURL", "React"] as const;
export type Language = (typeof LANGUAGES)[number];

export interface RequestSpec {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

const SENSITIVE_HEADER = /^(authorization|proxy-authorization|x-api-key|api-key|apikey|x-auth-token|x-access-token|cookie|x-token)$/i;
export const SECRET_PLACEHOLDER = "YOUR_API_KEY";

/** Replace credential header values so generated snippets never embed a real secret. */
export function maskSensitiveHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (!SENSITIVE_HEADER.test(k)) { out[k] = v; continue; }
    out[k] = /^bearer\s/i.test(v) ? `Bearer ${SECRET_PLACEHOLDER}` : /^basic\s/i.test(v) ? `Basic ${SECRET_PLACEHOLDER}` : SECRET_PLACEHOLDER;
  }
  return out;
}

const hasBody = (s: RequestSpec) => !!s.body?.trim() && ["POST", "PUT", "PATCH", "DELETE"].includes(s.method.toUpperCase());
const js = (s: string) => JSON.stringify(s);                       // valid JS and Python string literal
const php = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const pad = (text: string, n: number) => text.split("\n").map((l, i) => (i ? " ".repeat(n) + l : l)).join("\n");

function normalise(spec: RequestSpec) {
  const method = spec.method.toUpperCase();
  const url = spec.url.trim() || "https://api.example.com/endpoint";
  const headers = maskSensitiveHeaders(spec.headers);
  const body = hasBody(spec) ? spec.body! : undefined;
  if (body && !Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) headers["Content-Type"] = "application/json";
  return { method, url, headers, body };
}

export function generateSnippet(spec: RequestSpec, language: Language): string {
  const { method, url, headers, body } = normalise(spec);
  const hasHeaders = Object.keys(headers).length > 0;
  const headerObj = pad(JSON.stringify(headers, null, 2), 2);

  switch (language) {
    case "cURL": {
      const lines = [`curl --request ${method} \\`, `  --url ${sh(url)}`];
      for (const [k, v] of Object.entries(headers)) lines.push(`  --header ${sh(`${k}: ${v}`)}`);
      if (body) lines.push(`  --data ${sh(body)}`);
      return lines.join(" \\\n");
    }
    case "Python": {
      const args = [`url`];
      if (hasHeaders) args.push("headers=headers");
      if (body) args.push("data=payload");
      args.push("timeout=15");
      return [
        "import requests", "",
        `url = ${js(url)}`,
        hasHeaders ? `headers = ${JSON.stringify(headers, null, 4)}` : "",
        body ? `payload = ${js(body)}` : "",
        "",
        `response = requests.${method.toLowerCase()}(${args.join(", ")})`,
        "response.raise_for_status()",
        "print(response.json())",
      ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
    }
    case "PHP":
      return [
        "<?php",
        `$ch = curl_init(${php(url)});`,
        "curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);",
        "curl_setopt($ch, CURLOPT_TIMEOUT, 15);",
        `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ${php(method)});`,
        hasHeaders ? `curl_setopt($ch, CURLOPT_HTTPHEADER, [${Object.entries(headers).map(([k, v]) => php(`${k}: ${v}`)).join(", ")}]);` : "",
        body ? `curl_setopt($ch, CURLOPT_POSTFIELDS, ${php(body)});` : "",
        "$response = curl_exec($ch);",
        "if ($response === false) { throw new Exception(curl_error($ch)); }",
        "curl_close($ch);",
        "var_dump(json_decode($response, true));",
      ].filter(Boolean).join("\n");
    case "React": {
      const init = fetchInit(method, headerObj, body, 6);
      return [
        `import { useEffect, useState } from "react";`, "",
        "export function ApiData() {",
        "  const [data, setData] = useState<unknown>(null);",
        "  const [error, setError] = useState<string | null>(null);", "",
        "  useEffect(() => {",
        `    fetch(${js(url)}${init})`,
        "      .then((response) => {",
        "        if (!response.ok) throw new Error(`Request failed: ${response.status}`);",
        "        return response.json();",
        "      })",
        "      .then(setData)",
        "      .catch((err) => setError(err.message));",
        "  }, []);", "",
        `  if (error) return <p role="alert">{error}</p>;`,
        "  return <pre>{JSON.stringify(data, null, 2)}</pre>;",
        "}",
      ].join("\n");
    }
    default: {
      const ts = language === "TypeScript";
      return [
        `const url${ts ? ": string" : ""} = ${js(url)};`, "",
        `const response${ts ? ": Response" : ""} = await fetch(url${fetchInit(method, headerObj, body, 0)});`,
        "if (!response.ok) {", "  throw new Error(`Request failed: ${response.status}`);", "}", "",
        `const data${ts ? ": unknown" : ""} = await response.json();`,
        "console.log(data);",
      ].join("\n");
    }
  }
}

function fetchInit(method: string, headerObj: string, body: string | undefined, indent: number): string {
  const hasHeaders = headerObj !== "{}";
  if (method === "GET" && !hasHeaders) return "";
  const sp = " ".repeat(indent);
  const parts = [`${sp}  method: ${js(method)},`];
  if (hasHeaders) parts.push(`${sp}  headers: ${pad(headerObj, indent)},`);
  if (body) parts.push(`${sp}  body: ${js(body)},`);
  return `, {\n${parts.join("\n")}\n${sp}}`;
}

export const FILE_EXTENSION: Record<Language, string> = { JavaScript: "js", TypeScript: "ts", Python: "py", PHP: "php", cURL: "sh", React: "tsx" };
