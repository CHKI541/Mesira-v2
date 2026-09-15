"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { cx } from "@/lib/format";

/**
 * Avisos efímeros.
 *
 * La versión anterior usaba `alert()` del navegador para confirmar acciones, que
 * bloquea la pestaña entera y se ve como un error del sistema. Esto confirma sin
 * interrumpir, y el texto usa el mismo verbo que el botón que lo disparó:
 * "Publicar" produce "Publicada".
 */

type Tone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, tone, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cx(
              "reveal pointer-events-auto w-full max-w-md rounded-card border px-4 py-3 text-body shadow-lg",
              item.tone === "success" && "border-green/40 bg-green-soft text-green-ink",
              item.tone === "error" && "border-clay/40 bg-clay-soft text-clay",
              item.tone === "info" && "border-rule-strong bg-surface text-ink",
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, tone?: Tone) => void {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast tiene que usarse dentro de ToastProvider.");
  return context;
}
