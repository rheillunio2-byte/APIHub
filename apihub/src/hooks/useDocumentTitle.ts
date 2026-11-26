import { useEffect } from "react";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "");

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

/** Sets a unique <title>, meta description, Open Graph tags and (when VITE_SITE_URL is set) a canonical URL. */
export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const full = title === "APIHUB" ? "APIHUB — Discover. Test. Integrate." : `${title} · APIHUB`;
    document.title = full;
    setMeta('meta[property="og:title"]', "property", "og:title", full);
    if (description) {
      setMeta('meta[name="description"]', "name", "description", description);
      setMeta('meta[property="og:description"]', "property", "og:description", description);
    }
    if (SITE_URL) {
      const href = SITE_URL + window.location.pathname;
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
      link.href = href;
      setMeta('meta[property="og:url"]', "property", "og:url", href);
    }
  }, [title, description]);
}
