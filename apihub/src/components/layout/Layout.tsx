import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import GlowCursor from "../reactbits/GlowCursor";
import { Activity, Code2, Compass, FolderHeart, Heart, Home, Layers3, Menu, ShieldCheck, X, Zap } from "lucide-react";
import { useState } from "react";
const links = [
  ["/","Home",Home],["/explore","Explore APIs",Compass],["/categories","Categories",Layers3],
  ["/playground","Playground",Zap],["/generator","Code Generator",Code2],
  ["/collections","Collections",FolderHeart],["/favorites","Favorites",Heart],["/status","API Status",Activity]
] as const;
export default function Layout() {
  const [menu,setMenu] = useState(false);
  const { pathname } = useLocation();
  return <div className="app-shell">
    <GlowCursor className="app-glow" color="#7358f5" secondaryColor="#26c6da" intensity={1.1} trailWidth={2.5} linger={1.2} glow={1.1} hotspot={0.7} quality="medium" clickBurst aria-hidden="true"/>
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-mark"><Zap size={18}/></span><span>API<span className="accent">HUB</span><small>DISCOVER. TEST. INTEGRATE.</small></span></Link>
      <nav className="desktop-nav">{links.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==="/"} className={({isActive})=>isActive?"nav-link active":"nav-link"}><Icon size={15}/>{label}</NavLink>)}</nav>
      <div className="top-actions"><Link className="top-link" to="/admin"><ShieldCheck size={16}/> Admin</Link><button className="icon-button mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Toggle menu">{menu?<X/>:<Menu/>}</button></div>
    </header>
    {menu && <div className="mobile-nav">{links.map(([to,label,Icon])=><NavLink onClick={()=>setMenu(false)} key={to} to={to}><Icon size={16}/>{label}</NavLink>)}<NavLink onClick={()=>setMenu(false)} to="/admin"><ShieldCheck size={16}/>Admin</NavLink></div>}
    <div className="workspace"><main className="main-content"><div key={pathname} className="page-fade"><Outlet/></div></main></div>
  </div>;
}
