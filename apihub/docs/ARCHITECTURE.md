# Architecture

## Layers

| Layer | Location | Notes |
|---|---|---|
| Pages and components | `src/pages`, `src/components` | React 18 + React Router. Only the landing page is in the initial bundle; every other route is lazy-loaded. |
| Pure logic | `src/lib` | `catalog` (filter/sort/paginate/URL state), `codegen`, `history` (redaction), `verification` (status model), `storage` (sanitising parsers), `proxyClient`, `jsonHighlight`. No React imports, unit tested. |
| Shared safety rules | `supabase/functions/_shared/ssrf.ts` | URL/IP/header validation and the rate limiter, imported by both the browser (`src/lib/urlSafety.ts`) and the edge function. |
| Edge function | `supabase/functions/secure-proxy` | Validated, DNS-checked forwarding with redirect re-validation and caps. |
| Database | `supabase/migrations` | Schema, Row Level Security and indexes. Tested with `tests/sql/run.sh`. |

## Request flow (proxy mode)

1. The client validates method, URL and headers (`validateTargetUrl`, `sanitizeRequestHeaders`) and refuses unsafe targets without any network call.
2. It POSTs `{url, method, headers, body}` to `/functions/v1/secure-proxy` with the Supabase anon key.
3. The function checks origin and rate limit, re-validates the input, resolves DNS and rejects any private/reserved answer, then fetches with `redirect: "manual"` and a 15 s deadline.
4. Each redirect hop (max 5) goes through step 3 again. POST becomes GET on 301/302/303.
5. The body is read up to 1,000,000 bytes; response headers are filtered to an allow-list.
6. The client classifies the outcome with `classifyCheck` (Untested / Reachable / Unavailable / Verification failed).

## State

Favorites, collections and request history live in `localStorage` and are parsed defensively (`parseFavorites`, `parseCollections`, `parseHistory`): corrupted data is discarded rather than crashing a page. Filters live in the URL query string. Theme is stored under `apihub:theme`.

## Extending

- **New category:** add it to `categories` in `src/data/apis.ts` and use it on at least one API.
- **New API:** add an entry with real, checkable URLs. Leave `verification` as "Needs review" until you have actually verified it and set a date.
- **Removing a duplicate:** add the old id to `src/data/legacyIds.ts` so saved favorites and links keep working.

## Known limitations

See the README. In particular: DNS rebinding between the proxy's resolution and `fetch` is mitigated, not eliminated, and the in-memory rate limiter is per isolate.
