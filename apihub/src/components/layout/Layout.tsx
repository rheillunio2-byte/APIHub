import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, BookOpen, Code2, Compass, FolderHeart, GitCompare, Heart, Home, Layers3, Menu, Moon, Search, ShieldCheck, Sun, X, Zap } from "lucide-react";
import GlowCursor from "../reactbits/GlowCursor";
import CommandPalette from "../common/CommandPalette";
import { useTheme } from "../../hooks/useTheme";

const links = [
  ["/", "Home", Home], ["/explore", "Explore", Compass], ["/categories", "Categories", Layers3],
  ["/playground", "Playground", Zap], ["/generator", "Code Generator", Code2], ["/compare", "Compare", GitCompare],
  ["/collections", "Collections", FolderHeart], ["/favorites", "Favorites", Heart], ["/status", "API Status", Activity],
  ["/resources", "Resources", BookOpen],
] as const;

export default function Layout() {
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const { pathname } = useLocation();

  // Ctrl/Cmd+K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { setMenu(false); window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      {theme === "dark" && <GlowCursor className="app-glow" color="#7358f5" secondaryColor="#26c6da" intensity={1.1} trailWidth={2.5} linger={1.2} glow={1.1} hotspot={0.7} quality="medium" clickBurst aria-hidden="true" />}
      <header className="topbar">
        <Link to="/" className="brand" aria-label="APIHUB home"><span className="brand-mark"><Zap size={18} /></span><span>API<span className="accent">HUB</span><small>DISCOVER. TEST. INTEGRATE.</small></span></Link>
        <nav className="desktop-nav" aria-label="Main">
          {links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}><Icon size={15} aria-hidden="true" />{label}</NavLink>)}
        </nav>
        <div className="top-actions">
          <button className="palette-trigger" onClick={() => setPalette(true)} aria-label="Open command palette"><Search size={14} aria-hidden="true" /> Search <kbd>Ctrl K</kbd></button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          <Link className="top-link" to="/admin"><ShieldCheck size={16} /> Admin</Link>
          <button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-label="Toggle menu" aria-expanded={menu}>{menu ? <X /> : <Menu />}</button>
        </div>
      </header>
      {menu && (
        <nav className="mobile-nav" aria-label="Mobile">
          {links.map(([to, label, Icon]) => <NavLink onClick={() => setMenu(false)} key={to} to={to} end={to === "/"}><Icon size={16} />{label}</NavLink>)}
          <NavLink onClick={() => setMenu(false)} to="/admin"><ShieldCheck size={16} />Admin</NavLink>
        </nav>
      )}
      <div className="workspace"><main id="main" className="main-content"><div key={pathname} className="page-fade"><Outlet /></div></main></div>
      <footer className="site-footer">
        <div><strong>APIHUB</strong><p>An API discovery and testing workspace. Catalog entries are community-style starter records: confirm pricing, limits and terms with each provider's official documentation.</p></div>
        <nav aria-label="Footer"><Link to="/explore">Explore</Link><Link to="/resources">Resources</Link><Link to="/status">Status</Link><a href="https://github.com/rheillunio2-byte/APIHub" target="_blank" rel="noreferrer noopener">GitHub</a></nav>
      </footer>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
