import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Kind = "success" | "error" | "info";
interface ToastItem { id: number; message: string; kind: Kind }
const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const notify = useCallback((message: string, kind: Kind = "success") => {
    const id = next.current++;
    setItems((cur) => [...cur.slice(-3), { id, message, kind }]);
    window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3500);
  }, []);
  const value = useMemo(() => notify, [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

/** Copy text and tell the user whether it worked. */
export function useCopy() {
  const notify = useToast();
  return useCallback(async (text: string, label = "Copied to clipboard") => {
    try { await navigator.clipboard.writeText(text); notify(label); }
    catch { notify("Copy failed – your browser blocked clipboard access.", "error"); }
  }, [notify]);
}
