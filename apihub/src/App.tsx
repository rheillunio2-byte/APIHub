import { Routes,Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Categories from "./pages/Categories";
import ApiDetails from "./pages/ApiDetails";
import Playground from "./pages/Playground";
import CodeGenerator from "./pages/CodeGenerator";
import Collections from "./pages/Collections";
import Favorites from "./pages/Favorites";
import ApiStatus from "./pages/ApiStatus";
import Admin from "./pages/Admin";
function NotFound(){return <div className="page empty-state"><h1>Page not found</h1><p>The page you're looking for doesn't exist.</p><a className="btn-primary" href="/">Go home</a></div>}
export default function App(){return <Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="/explore" element={<Explore/>}/><Route path="/categories" element={<Categories/>}/><Route path="/api/:id" element={<ApiDetails/>}/><Route path="/playground" element={<Playground/>}/><Route path="/generator" element={<CodeGenerator/>}/><Route path="/collections" element={<Collections/>}/><Route path="/favorites" element={<Favorites/>}/><Route path="/status" element={<ApiStatus/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<NotFound/>}/></Route></Routes>}
