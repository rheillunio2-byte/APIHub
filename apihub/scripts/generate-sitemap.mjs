// Writes public/sitemap.xml from the catalog. Never fails the build; skips quietly without a site URL
// because a sitemap must contain absolute URLs and APIHub does not assume a domain.
import { writeFileSync, mkdirSync } from "node:fs";
import { apis } from "../src/data/apis.ts";

const site = (process.env.VITE_SITE_URL || process.env.SITE_URL || "").replace(/\/$/, "");
if (!site) { console.warn("[sitemap] VITE_SITE_URL not set – skipping sitemap.xml"); process.exit(0); }

const pages = ["", "/explore", "/categories", "/playground", "/generator", "/compare", "/collections", "/resources", "/status"];
const urls = [...pages, ...apis.map((a) => `/api/${a.id}`)];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(site + u)}</loc></url>`).join("\n")}\n</urlset>\n`;
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
console.log(`[sitemap] wrote ${urls.length} URLs for ${site}`);
