import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { apis } from "../../data/apis";
import { suggest } from "../../lib/catalog.ts";

const PAGES: Array<[string, string]> = [
  ["Home", "/"], ["Explore APIs", "/explore"], ["Categories", "/categories"], ["API Playground", "/playground"],
  ["Code Generator", "/generator"], ["Compare APIs", "/compare"], ["Collections", "/collections"], ["Favorites", "/favorites"],
  ["API Status", "/status"], ["Developer Resources", "/resources"], ["Submit & Admin (demo)", "/admin"],
];

interface Item { label: string; hint: string; to: string }

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const items = useMemo<Item[]>(() => {
    const query = q.trim().toLowerCase();
    const pages = PAGES.filter(([l]) => !query || l.toLowerCase().includes(query)).map(([label, to]) => ({ label, hint: "Page", to }));
    const found = suggest(apis, q, 6).map((a) => ({ label: a.name, hint: a.category, to: `/api/${a.id}` }));
    return [...found, ...pages].slice(0, 10);
  }, [q]);

  useEffect(() => { if (open) { setQ(""); setIndex(0); window.setTimeout(() => input.current?.focus(), 0); } }, [open]);
  useEffect(() => setIndex(0), [q]);
  if (!open) return null;

  const go = (item?: Item) => { if (!item) return; onClose(); navigate(item.to); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(items[index]); }
    else if (e.key === "Tab") { e.preventDefault(); }
  };

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="palette-input"><Search size={16} aria-hidden="true" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search APIs or jump to a page…" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={items[index] ? `palette-${index}` : undefined} aria-label="Search APIs or pages" />
          <kbd>Esc</kbd></div>
        <ul id="palette-list" role="listbox">
          {items.map((item, i) => (
            <li key={item.to + item.label} id={`palette-${i}`} role="option" aria-selected={i === index} className={i === index ? "active" : ""} onMouseEnter={() => setIndex(i)} onClick={() => go(item)}>
              <span>{item.label}</span><small>{item.hint}</small>
            </li>
          ))}
          {!items.length && <li className="palette-empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
