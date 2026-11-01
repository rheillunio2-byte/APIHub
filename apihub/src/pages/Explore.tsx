import { useMemo,useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import ApiCard from "../components/common/ApiCard";
import { apis,categories } from "../data/apis";
import { getFavorites,saveFavorites } from "../lib/storage";
export default function Explore(){
 const [params]=useSearchParams(); const [q,setQ]=useState(params.get("q")||""); const [category,setCategory]=useState(params.get("category")||"All categories");
 const [pricing,setPricing]=useState("All pricing"); const [auth,setAuth]=useState("All auth"); const [https,setHttps]=useState("Any"); const [cors,setCors]=useState("Any"); const [sort,setSort]=useState("Popular"); const [favorites,setFavorites]=useState(getFavorites);
 const toggle=(id:string)=>{const n=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];setFavorites(n);saveFavorites(n);};
 const filtered=useMemo(()=>apis.filter(a=>(`${a.name} ${a.description} ${a.category} ${a.provider}`.toLowerCase().includes(q.toLowerCase()))&&(category==="All categories"||a.category===category)&&(pricing==="All pricing"||a.pricing===pricing)&&(auth==="All auth"||a.auth===auth)&&(https==="Any"||(https==="Yes"&&a.https)||(https==="No"&&!a.https))&&(cors==="Any"||a.cors===cors)),[q,category,pricing,auth,https,cors]);
 const sorted=[...filtered].sort((a,b)=>sort==="Alphabetical"?a.name.localeCompare(b.name):sort==="Beginner-friendly"?Number(b.beginner)-Number(a.beginner):0);
 const clear=()=>{setQ("");setCategory("All categories");setPricing("All pricing");setAuth("All auth");setHttps("Any");setCors("Any");};
 return <div className="page"><PageHeader eyebrow="API DIRECTORY" title="Explore APIs" description="Search, compare and evaluate APIs for your next build."/><div className="explore-toolbar"><div className="search-field"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search APIs, descriptions, categories..."/></div><div className="result-count">{filtered.length} APIs found</div></div>
 <div className="filter-panel"><div className="filter-title"><SlidersHorizontal size={15}/> FILTERS <button onClick={clear}>Clear all <X size={13}/></button></div><div className="filter-controls">
 <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option>All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Pricing<select value={pricing} onChange={e=>setPricing(e.target.value)}>{["All pricing","Free","Freemium","Paid","Free trial"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Authentication<select value={auth} onChange={e=>setAuth(e.target.value)}>{["All auth","No key","API key","OAuth","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>HTTPS<select value={https} onChange={e=>setHttps(e.target.value)}><option>Any</option><option>Yes</option><option>No</option></select></label>
 <label>CORS<select value={cors} onChange={e=>setCors(e.target.value)}>{["Any","Yes","No","Unknown"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Sort by<select value={sort} onChange={e=>setSort(e.target.value)}><option>Popular</option><option>Alphabetical</option><option>Beginner-friendly</option></select></label>
 </div></div>
 {sorted.length?<div className="api-grid">{sorted.map(a=><ApiCard key={a.id} api={a} favorite={favorites.includes(a.id)} onFavorite={()=>toggle(a.id)}/>)}</div>:<div className="empty-state"><Search size={28}/><h3>No APIs match those filters</h3><p>Try changing your search or clearing some filters.</p><button className="btn-secondary" onClick={clear}>Clear filters</button></div>}
 </div>;
}
