// Endpoint verification model. Four distinct, deliberately conservative states.
//   Untested            – no check has been run.
//   Reachable           – the endpoint answered an HTTP request (says nothing about correctness or uptime).
//   Unavailable         – the check reached (or tried to reach) the host and it failed (5xx, 404/410, timeout, connection error).
//   Verification failed – the check itself could not be completed (blocked, proxy/CORS problem); NOT evidence the API is down.

export type EndpointStatus = "Untested" | "Reachable" | "Unavailable" | "Verification failed";

export type CheckFailure = "timeout" | "network" | "blocked" | "proxy" | "browser-blocked";

export interface CheckInput { statusCode?: number; failure?: CheckFailure }
export interface CheckResult { status: EndpointStatus; detail: string }

export function classifyCheck({ statusCode, failure }: CheckInput): CheckResult {
  if (failure === "timeout") return { status: "Unavailable", detail: "The request timed out." };
  if (failure === "network") return { status: "Unavailable", detail: "Could not connect to the host (DNS or connection error)." };
  if (failure === "blocked") return { status: "Verification failed", detail: "The target was rejected by APIHub's request-safety rules." };
  if (failure === "proxy") return { status: "Verification failed", detail: "The verification service could not be reached." };
  if (failure === "browser-blocked") return { status: "Verification failed", detail: "The browser blocked the response (likely CORS). This does not mean the API is down." };
  if (statusCode == null) return { status: "Untested", detail: "No check has been run." };
  if (statusCode >= 200 && statusCode < 400) return { status: "Reachable", detail: `Responded HTTP ${statusCode}.` };
  if (statusCode === 401 || statusCode === 403) return { status: "Reachable", detail: `Responded HTTP ${statusCode}; the endpoint requires credentials.` };
  if (statusCode === 429) return { status: "Reachable", detail: "Responded HTTP 429; the endpoint is rate limiting requests." };
  if (statusCode === 404 || statusCode === 410) return { status: "Unavailable", detail: `Responded HTTP ${statusCode}; the example endpoint may have moved.` };
  if (statusCode >= 500) return { status: "Unavailable", detail: `Responded HTTP ${statusCode}.` };
  if (statusCode >= 400) return { status: "Reachable", detail: `Responded HTTP ${statusCode}; the server answered but rejected the request.` };
  return { status: "Verification failed", detail: `Unexpected HTTP status ${statusCode}.` };
}
