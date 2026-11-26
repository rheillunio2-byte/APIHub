import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import { useDocumentTitle } from "./hooks/useDocumentTitle";

// Code splitting: only the landing page is in the initial bundle.
const Explore = lazy(() => import("./pages/Explore"));
const Categories = lazy(() => import("./pages/Categories"));
const ApiDetails = lazy(() => import("./pages/ApiDetails"));
const Playground = lazy(() => import("./pages/Playground"));
const CodeGenerator = lazy(() => import("./pages/CodeGenerator"));
const Compare = lazy(() => import("./pages/Compare"));
const Resources = lazy(() => import("./pages/Resources"));
const Collections = lazy(() => import("./pages/Collections"));
const Favorites = lazy(() => import("./pages/Favorites"));
const ApiStatus = lazy(() => import("./pages/ApiStatus"));
const Admin = lazy(() => import("./pages/Admin"));

function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="page empty-state">
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link className="btn-primary" to="/">Go home</Link>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="page" role="status" aria-live="polite">
      <div className="skeleton-block"><div className="skeleton" /><div className="skeleton short" /><div className="skeleton" /></div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/api/:id" element={<ApiDetails />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/generator" element={<CodeGenerator />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/status" element={<ApiStatus />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
