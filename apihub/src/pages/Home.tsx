import { ArrowRight, Search, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { apis,categories } from "../data/apis";
import ApiCard from "../components/common/ApiCard";
import { getFavorites,saveFavorites } from "../lib/storage";
import Stack from "../components/reactbits/Stack";
import { BlurWords, CountUp, Reveal } from "../components/common/Motion";
import { useNavigate } from "react-router-dom";
export default function Home() {
 const [q,setQ]=useState(""); const [favorites,setFavorites]=useState(getFavorites); const navigate=useNavigate();
 const toggle=(id:string)=>{const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];setFavorites(next);saveFavorites(next);};
 return <div className="page">
  <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> THE DEVELOPER API WORKSPACE</div><h1><BlurWords text="Every API you need."/><br/><BlurWords text="All in one hub." className="gradient-text" delay={320}/></h1><p>Discover useful APIs, test endpoints, and generate integration code for your next project.</p>
   <form className="hero-search" onSubmit={e=>{e.preventDefault();navigate(`/explore?q=${encodeURIComponent(q)}`)}}><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search APIs, categories, or use cases..."/><button>Search <ArrowRight size={15}/></button></form>
   <div className="hero-ctas"><Link to="/explore" className="btn-primary">Explore APIs <ArrowRight size={16}/></Link><Link to="/playground" className="btn-secondary"><Zap size={16}/> Open Playground</Link></div>
   <div className="hero-stats"><div><CountUp to={apis.length}/><span>DISCOVERABLE APIs</span></div><div><CountUp to={categories.length}/><span>CATEGORIES</span></div><div><CountUp to={6}/><span>CODE TARGETS</span></div></div>
  </div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hub-glow"/><div className="hero-stack"><Stack layout="fan" sendToBackOnClick autoplay autoplayDelay={4200} pauseOnHover spread={0.6} cards={apis.slice(0,5).map(a=><div className="stack-api" key={a.id}><div className="api-icon">{a.name.slice(0,1)}</div><span className="pill">{a.category}</span><h3>{a.name}</h3><p>{a.description}</p><div className="stack-api-meta"><span><ShieldCheck size={12}/>{a.https?"HTTPS":"HTTP"}</span><span className="price">{a.pricing}</span></div></div>)}/></div><div className="art-caption"><span className="live-dot"/> DRAG OR CLICK THE CARDS</div></div>
  </section>
  <Reveal className="section-block"><div className="section-heading"><div><div className="eyebrow">BROWSE BY DOMAIN</div><h2>Explore categories</h2></div><Link to="/categories" className="text-link">All categories <ArrowRight size={15}/></Link></div>
   <div className="category-grid">{categories.slice(0,8).map((c,i)=><Link to={`/explore?category=${encodeURIComponent(c)}`} key={c} className="category-tile"><span className="category-symbol">{["✦","☁","◈","⌖","▤","▶","▧","⌘"][i]}</span><span>{c}</span><ArrowRight size={14}/></Link>)}</div>
  </Reveal>
  <Reveal className="section-block"><div className="section-heading"><div><div className="eyebrow">HAND-PICKED STARTERS</div><h2>Popular APIs</h2><p>Useful starting points for experiments and prototypes.</p></div><Link to="/explore" className="text-link">Explore directory <ArrowRight size={15}/></Link></div>
   <div className="api-grid">{apis.slice(0,3).map(a=><ApiCard key={a.id} api={a} favorite={favorites.includes(a.id)} onFavorite={()=>toggle(a.id)}/>)}</div>
  </Reveal>
  <Reveal className="how-section"><div><div className="eyebrow">SIMPLE WORKFLOW</div><h2>From discovery to integration.</h2><p>Everything you need to evaluate an API before adding it to your stack.</p></div><div className="steps">{[["01","Discover","Find an API that fits your use case."],["02","Understand","Review auth, pricing and provider docs."],["03","Test","Send a real request in the playground."],["04","Integrate","Generate starter code for your app."]].map(s=><div className="step" key={s[0]}><b>{s[0]}</b><strong>{s[1]}</strong><span>{s[2]}</span></div>)}</div></Reveal>
 </div>;
}
