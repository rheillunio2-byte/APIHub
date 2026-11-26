// Browser-side entry point for the shared request-safety rules.
// The canonical implementation lives with the edge function so both agree.
export * from "../../supabase/functions/_shared/ssrf.ts";
