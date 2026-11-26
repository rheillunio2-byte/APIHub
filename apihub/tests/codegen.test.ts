import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSnippet, maskSensitiveHeaders, LANGUAGES } from "../src/lib/codegen.ts";

const spec = { method: "POST", url: "https://api.example.com/v1/items?a=1&b=2", headers: { Authorization: "Bearer sk-live-SECRET", Accept: "application/json" }, body: '{"name":"O\'Brien","q":"say \\"hi\\""}' };

test("never leaks credential header values into any language", () => {
  for (const lang of LANGUAGES) {
    const out = generateSnippet(spec, lang);
    assert.ok(!out.includes("sk-live-SECRET"), `${lang} leaked secret`);
  }
  assert.ok(generateSnippet(spec, "cURL").includes("Bearer YOUR_API_KEY"));
  assert.deepEqual(maskSensitiveHeaders({ "X-API-Key": "abc", Accept: "x" }), { "X-API-Key": "YOUR_API_KEY", Accept: "x" });
});

test("cURL escapes single quotes safely", () => {
  const out = generateSnippet(spec, "cURL");
  assert.ok(out.includes(`--data '{"name":"O'\\''Brien","q":"say \\"hi\\""}'`), out);
  assert.ok(out.startsWith("curl --request POST"));
  assert.ok(out.includes("--header 'Content-Type: application/json'"), "adds a JSON content type when a body is sent");
});

test("a URL containing quotes or newlines cannot break out of the string literal", () => {
  const evil = { method: "GET", url: 'https://x.example/"; process.exit(1); //' };
  const js = generateSnippet(evil, "JavaScript");
  assert.ok(js.includes(String.raw`"https://x.example/\"; process.exit(1); //"`), js);
  const sh = generateSnippet({ method: "GET", url: "https://x.example/'; rm -rf / #" }, "cURL");
  assert.ok(sh.includes(`'https://x.example/'\\''; rm -rf / #'`), sh);
  const php = generateSnippet({ method: "GET", url: "https://x.example/'.phpinfo().'" }, "PHP");
  assert.ok(php.includes(String.raw`'https://x.example/\'.phpinfo().\''`), php);
});

test("JavaScript output is syntactically valid and uses method, headers and body", () => {
  const out = generateSnippet(spec, "JavaScript");
  new Function(`return (async () => {\n${out.replace("await fetch(url", "await (async()=>({ok:true,json:async()=>1}))(url")}\n})`);
  assert.ok(out.includes('method: "POST"'));
  assert.ok(out.includes('"Content-Type": "application/json"'));
  assert.ok(out.includes("body:"));
});

test("GET without headers stays minimal; TypeScript adds annotations", () => {
  const out = generateSnippet({ method: "GET", url: "https://a.example/x" }, "TypeScript");
  assert.ok(out.includes('await fetch(url);'));
  assert.ok(out.includes("const url: string") && out.includes("const data: unknown"));
});

test("GET ignores body; Python and PHP carry method/body/headers", () => {
  assert.ok(!generateSnippet({ method: "GET", url: "https://a.example", body: "{}" }, "Python").includes("payload"));
  const py = generateSnippet(spec, "Python");
  assert.ok(py.includes("requests.post(url, headers=headers, data=payload, timeout=15)"), py);
  const php = generateSnippet(spec, "PHP");
  assert.ok(php.includes("CURLOPT_CUSTOMREQUEST, 'POST'") && php.includes("CURLOPT_POSTFIELDS"));
});

test("empty URL falls back to a placeholder", () => {
  assert.ok(generateSnippet({ method: "GET", url: "  " }, "cURL").includes("https://api.example.com/endpoint"));
});
