import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** True once the element has scrolled into view (fires once). */
function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/** Fade + rise on scroll. `delay` in ms, handy for staggering grids. */
export function Reveal({ children, delay = 0, className = "", style }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <div ref={ref} className={`reveal${seen ? " is-in" : ""} ${className}`.trim()} style={{ ...style, transitionDelay: `${delay}ms` }}>{children}</div>;
}

/** Word-by-word blur-in headline. `className` is applied to every word. */
export function BlurWords({ text, className = "", delay = 0, step = 70 }: { text: string; className?: string; delay?: number; step?: number }) {
  const words = text.split(" ");
  return <>{words.map((w, i) => <span key={i} className={`blur-word ${className}`.trim()} style={{ animationDelay: `${delay + i * step}ms` }}>{w}{i < words.length - 1 ? " " : ""}</span>)}</>;
}

/** Counts up to `to` when scrolled into view. */
export function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
  const [ref, seen] = useInView<HTMLElement>(0.4);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setValue(to); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);
  return <strong ref={ref}>{value}</strong>;
}
