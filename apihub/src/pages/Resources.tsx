import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import CodeSample from "../components/common/CodeSample";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const TOC: Array<[string, string]> = [
  ["rest", "REST fundamentals"], ["methods", "HTTP methods"], ["status", "Status codes"], ["json", "JSON"],
  ["auth", "Authentication"], ["errors", "Error handling"], ["security", "Security best practices"], ["example", "Integration example"],
];

export default function Resources() {
  useDocumentTitle("Developer Resources", "Beginner-friendly guides to REST APIs, HTTP methods, JSON, authentication, error handling and API security, with working code examples.");
  return (
    <div className="page">
      <PageHeader eyebrow="LEARN" title="Developer Resources" description="Short, practical guides for working with web APIs – from your first request to production habits." />
      <div className="resources-layout">
        <nav className="content-panel resources-toc" aria-label="On this page"><div className="eyebrow">ON THIS PAGE</div>
          <ul>{TOC.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul></nav>
        <div className="resources-body">
          <section id="rest" className="content-panel prose"><div className="eyebrow">FUNDAMENTALS</div><h2>REST fundamentals</h2>
            <p>An API (application programming interface) lets one program ask another for data or actions. A <b>REST</b> API does this over HTTP: you send a <b>request</b> to a URL and get a <b>response</b>.</p>
            <ul><li><b>Resources</b> are things like users or posts, identified by URLs such as <code>/users/42</code>.</li>
              <li><b>Methods</b> say what you want to do with the resource (read, create, update, delete).</li>
              <li><b>Representations</b> are the data formats exchanged – most often JSON.</li>
              <li><b>Stateless</b> means each request carries everything the server needs; the server does not remember your previous request.</li></ul>
            <p>A request has a method, URL, headers (metadata) and sometimes a body. A response has a status code, headers and usually a body. Try one in the <Link to="/playground">Playground</Link>.</p></section>

          <section id="methods" className="content-panel prose"><div className="eyebrow">HTTP</div><h2>HTTP methods explained</h2>
            <div className="table-scroll"><table className="compare-table"><thead><tr><th>Method</th><th>Typical use</th><th>Safe?</th><th>Idempotent?</th></tr></thead><tbody>
              <tr><td><code>GET</code></td><td>Read a resource. Never changes data.</td><td>Yes</td><td>Yes</td></tr>
              <tr><td><code>POST</code></td><td>Create a resource or trigger an action.</td><td>No</td><td>No</td></tr>
              <tr><td><code>PUT</code></td><td>Replace a resource completely.</td><td>No</td><td>Yes</td></tr>
              <tr><td><code>PATCH</code></td><td>Change part of a resource.</td><td>No</td><td>Not guaranteed</td></tr>
              <tr><td><code>DELETE</code></td><td>Remove a resource.</td><td>No</td><td>Yes</td></tr></tbody></table></div>
            <p><b>Safe</b> methods don't modify server state. <b>Idempotent</b> methods give the same end result whether you call them once or many times, which makes retrying them safer.</p></section>

          <section id="status" className="content-panel prose"><div className="eyebrow">HTTP</div><h2>Status codes</h2>
            <ul><li><b>2xx success</b> – <code>200 OK</code>, <code>201 Created</code>, <code>204 No Content</code>.</li>
              <li><b>3xx redirect</b> – <code>301</code>/<code>302</code>/<code>304 Not Modified</code>.</li>
              <li><b>4xx your request is the problem</b> – <code>400 Bad Request</code>, <code>401 Unauthorized</code> (missing/invalid credentials), <code>403 Forbidden</code> (not allowed), <code>404 Not Found</code>, <code>422 Unprocessable Content</code>, <code>429 Too Many Requests</code>.</li>
              <li><b>5xx the server is the problem</b> – <code>500</code>, <code>502</code>, <code>503</code>, <code>504</code>.</li></ul></section>

          <section id="json" className="content-panel prose"><div className="eyebrow">DATA</div><h2>JSON in five minutes</h2>
            <p>JSON is text with six value types: object, array, string, number, boolean and <code>null</code>. Keys and strings use double quotes; there are no comments and no trailing commas.</p>
            <CodeSample label="JSON example" code={`{
  "id": 1,
  "title": "Learn APIs",
  "done": false,
  "tags": ["http", "json"],
  "owner": { "name": "Ada" },
  "dueDate": null
}`} />
            <CodeSample label="Parsing JSON in JavaScript" code={`const data = JSON.parse(text);        // text → object (throws on invalid JSON)
const text2 = JSON.stringify(data);   // object → text`} />
            <p>Always set <code>Content-Type: application/json</code> when you send a JSON body.</p></section>

          <section id="auth" className="content-panel prose"><div className="eyebrow">ACCESS</div><h2>Authentication tutorials</h2>
            <p><b>Authentication</b> proves who you are; <b>authorization</b> decides what you may do. Common schemes:</p>
            <ul><li><b>No auth</b> – public data; usually rate limited by IP.</li>
              <li><b>API key</b> – a secret string sent in a header (e.g. <code>X-API-Key</code>) or, for some providers, a query parameter. Prefer headers: URLs end up in logs and browser history.</li>
              <li><b>Bearer token</b> – <code>Authorization: Bearer &lt;token&gt;</code>, often obtained through OAuth 2.0.</li>
              <li><b>OAuth 2.0</b> – lets a user grant your app limited access without sharing a password. Browser and mobile apps should use the authorization-code flow with PKCE.</li></ul>
            <CodeSample label="Sending an API key from a server" code={`// Node.js (server side) – the key comes from an environment variable
const res = await fetch("https://api.example.com/v1/items", {
  headers: { Authorization: \`Bearer \${process.env.EXAMPLE_API_KEY}\` },
});`} />
            <p>Never put secret keys in front-end code, repositories or screenshots: anything shipped to a browser can be read by users. Call the API from a backend you control instead.</p></section>

          <section id="errors" className="content-panel prose"><div className="eyebrow">RELIABILITY</div><h2>Error handling guide</h2>
            <ul><li><b>Check the status.</b> <code>fetch</code> only rejects on network failures – a <code>404</code> or <code>500</code> still resolves, so test <code>response.ok</code>.</li>
              <li><b>Set a timeout</b> so a slow server cannot hang your app.</li>
              <li><b>Retry only what is safe</b>: network errors, <code>429</code> and <code>5xx</code> on idempotent requests, with exponential backoff and jitter. Honour the <code>Retry-After</code> header.</li>
              <li><b>Handle invalid JSON</b> – servers sometimes return HTML error pages.</li>
              <li><b>Show useful messages</b> to users and log details (without secrets) for yourself.</li></ul>
            <CodeSample label="Robust fetch helper" code={`async function getJson(url, { retries = 2, timeoutMs = 10000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.status === 429 || res.status >= 500) throw new Error(\`Retryable: \${res.status}\`);
      if (!res.ok) throw Object.assign(new Error(\`HTTP \${res.status}\`), { fatal: true });
      return await res.json();
    } catch (err) {
      if (err.fatal || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 500 + Math.random() * 250));
    }
  }
}`} /></section>

          <section id="security" className="content-panel prose"><div className="eyebrow">SAFETY</div><h2>API security best practices</h2>
            <ul><li>Keep secrets in environment variables on a server; rotate any key that leaks.</li>
              <li>Use HTTPS everywhere. Treat <code>http://</code> APIs as readable by anyone on the network.</li>
              <li>Request the minimum scopes/permissions you need.</li>
              <li>Validate and encode anything you put into a URL or a page; never render API text as HTML without sanitising it.</li>
              <li>Respect rate limits and provider terms; cache responses when you can.</li>
              <li>If your server fetches user-supplied URLs, block private and cloud-metadata addresses (SSRF) – APIHub's own proxy does this.</li>
              <li>Don't log credentials, tokens or full request bodies.</li></ul></section>

          <section id="example" className="content-panel prose"><div className="eyebrow">PRACTICE</div><h2>Practical integration example</h2>
            <p>Fetch today's temperature from the free <Link to="/api/open-meteo">Open-Meteo</Link> API (no key required) and handle errors properly:</p>
            <CodeSample label="Weather example" code={`const url = "https://api.open-meteo.com/v1/forecast?latitude=14.6&longitude=121&current=temperature_2m";

try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(\`Request failed: \${res.status}\`);
  const data = await res.json();
  console.log(\`Temperature: \${data.current.temperature_2m} \${data.current_units.temperature_2m}\`);
} catch (err) {
  console.error("Could not load weather:", err.message);
}`} />
            <p><Link className="btn-primary inline-btn" to={`/playground?url=${encodeURIComponent("https://api.open-meteo.com/v1/forecast?latitude=14.6&longitude=121&current=temperature_2m")}`}>Run it in the Playground</Link></p></section>
        </div>
      </div>
    </div>
  );
}
