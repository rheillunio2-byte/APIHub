import { ArrowRight, Code2, Search, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { apis,categories } from "../data/apis";
import ApiCard from "../components/common/ApiCard";
import { getFavorites,saveFavorites } from "../lib/storage";
import { useNavigate } from "react-router-dom";
export default function Home() {
 const [q,setQ]=useState(""); const [favorites,setFavorites]=useState(getFavorites); const navigate=useNavigate();
 const toggle=(id:string)=>{const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];setFavorites(next);saveFavorites(next);};
 return <div className="page">
  <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> THE DEVELOPER API WORKSPACE</div><h1>Every API you need.<br/><span className="gradient-text">All in one hub.</span></h1><p>Discover useful APIs, test endpoints, and generate integration code for your next project.</p>
   <form className="hero-search" onSubmit={e=>{e.preventDefault();navigate(`/explore?q=${encodeURIComponent(q)}`)}}><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search APIs, categories, or use cases..."/><button>Search <ArrowRight size={15}/></button></form>
   <div className="hero-ctas"><Link to="/explore" className="btn-primary">Explore APIs <ArrowRight size={16}/></Link><Link to="/playground" className="btn-secondary"><Zap size={16}/> Open Playground</Link></div>
   <div className="hero-stats"><div><strong>{apis.length}</strong><span>DISCOVERABLE APIs</span></div><div><strong>{categories.length}</strong><span>CATEGORIES</span></div><div><strong>6</strong><span>CODE TARGETS</span></div></div>
  </div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hub-core"><Zap size={38}/><b>API</b></div><div className="float-node node-a"><Code2/></div><div className="float-node node-b"><ShieldCheck/></div><div className="float-node node-c"><Search/></div><div className="art-caption"><span className="live-dot"/> CONNECT YOUR NEXT IDEA</div></div>
  </section>
  <section className="section-block"><div className="section-heading"><div><div className="eyebrow">BROWSE BY DOMAIN</div><h2>Explore categories</h2></div><Link to="/categories" className="text-link">All categories <ArrowRight size={15}/></Link></div>
   <div className="category-grid">{categories.slice(0,8).map((c,i)=><Link to={`/explore?category=${encodeURIComponent(c)}`} key={c} className="category-tile"><span className="category-symbol">{["✦","☁","◈","⌖","▤","▶","▧","⌘"][i]}</span><span>{c}</span><ArrowRight size={14}/></Link>)}</div>
  </section>
  <section className="section-block"><div className="section-heading"><div><div className="eyebrow">HAND-PICKED STARTERS</div><h2>Popular APIs</h2><p>Useful starting points for experiments and prototypes.</p></div><Link to="/explore" className="text-link">Explore directory <ArrowRight size={15}/></Link></div>
   <div className="api-grid">{apis.slice(0,3).map(a=><ApiCard key={a.id} api={a} favorite={favorites.includes(a.id)} onFavorite={()=>toggle(a.id)}/>)}</div>
  </section>
  <section className="how-section"><div><div className="eyebrow">SIMPLE WORKFLOW</div><h2>From discovery to integration.</h2><p>Everything you need to evaluate an API before adding it to your stack.</p></div><div className="steps">{[["01","Discover","Find an API that fits your use case."],["02","Understand","Review auth, pricing and provider docs."],["03","Test","Send a real request in the playground."],["04","Integrate","Generate starter code for your app."]].map(s=><div className="step" key={s[0]}><b>{s[0]}</b><strong>{s[1]}</strong><span>{s[2]}</span></div>)}</div></section>
 </div>;
}
