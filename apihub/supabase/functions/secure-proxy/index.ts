// Example secure server-side proxy scaffold.
// Deploy only after adding provider allowlisting, auth, rate limiting and request validation.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  return Response.json({
    error: "Proxy is not enabled. Configure a strict provider allowlist, authenticated access, rate limits, and secret handling before implementation."
  }, { status: 501 });
});
