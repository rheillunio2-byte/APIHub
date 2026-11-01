import { useState } from "react";
import PageHeader from "../components/common/PageHeader";
import ApiCard from "../components/common/ApiCard";
import { apis } from "../data/apis";
import { getFavorites,saveFavorites } from "../lib/storage";
export default function Favorites(){const [f,setF]=useState(getFavorites);const items=apis.filter(a=>f.includes(a.id));const toggle=(id:string)=>{const n=f.filter(x=>x!==id);setF(n);saveFavorites(n)};return <div className="page"><PageHeader eyebrow="YOUR WORKSPACE" title="Favorites" description="A quick-access list of APIs you've saved."/><div className="section-heading compact-heading"><p>{items.length} saved APIs</p></div>{items.length?<div className="api-grid">{items.map(a=><ApiCard key={a.id} api={a} favorite onFavorite={()=>toggle(a.id)}/>)}</div>:<div className="empty-state"><h3>No favorites yet</h3><p>Save APIs from the explorer to build your shortlist.</p><a className="btn-primary" href="/explore">Explore APIs</a></div>}</div>}
