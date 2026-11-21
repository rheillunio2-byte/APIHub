import { Link } from "react-router-dom";
import { ArrowUpRight, Heart, KeyRound, ShieldCheck } from "lucide-react";
import type { ApiRecord } from "../../types";
export default function ApiCard({api,favorite,onFavorite}:{api:ApiRecord;favorite:boolean;onFavorite:()=>void}) {
  const spot=(e:React.MouseEvent<HTMLElement>)=>{const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty("--mx",`${e.clientX-r.left}px`);e.currentTarget.style.setProperty("--my",`${e.clientY-r.top}px`);};
  return <article className="api-card spotlight" onMouseMove={spot}>
    <div className="card-top"><div className="api-icon">{api.name.slice(0,1)}</div><button className={favorite?"favorite-btn saved":"favorite-btn"} onClick={onFavorite} aria-label={favorite?"Remove favorite":"Add favorite"}><Heart size={17} fill={favorite?"currentColor":"none"}/></button></div>
    <div className="card-title-row"><h3>{api.name}</h3><span className="pill">{api.category}</span></div>
    <p className="api-description">{api.description}</p>
    <div className="meta-grid"><span><KeyRound size={13}/>{api.auth}</span><span><ShieldCheck size={13}/>{api.https?"HTTPS":"No HTTPS"}</span><span className="price">{api.pricing}</span></div>
    <div className="card-footer"><span className="muted-small">CORS: {api.cors}</span><Link to={`/api/${api.id}`} className="text-link">View details <ArrowUpRight size={14}/></Link></div>
  </article>;
}
