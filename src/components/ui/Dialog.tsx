"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cx } from "@/lib/format";

/**
 * Diálogo modal construido sobre <dialog> nativo.
 *
 * Usar el elemento nativo en lugar de un div con position:fixed resuelve solo el
 * foco atrapado, el cierre con Escape, la capa superior y el fondo inerte. La
 * versión anterior lo hacía a mano y tenía el scroll del fondo suelto y el foco
 * escapándose del modal.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (open && !node.open) {
      node.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && node.open) {
      node.close();
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" } as const;

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clic fuera del panel: el <dialog> ocupa toda la pantalla, así que
        // el evento sobre el propio dialog significa "afuera".
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cx(
        "m-auto w-[calc(100vw-2rem)] rounded-card border border-rule bg-surface p-0 text-ink",
        "backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]",
        "max-h-[calc(100dvh-3rem)] overflow-hidden",
        widths[size],
      )}
    >
      <div className="flex max-h-[calc(100dvh-3rem)] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div className="min-w-0">
            <h2 id="dialog-title" className="text-h2 font-bold">
              {title}
            </h2>
            {description ? <p className="mt-1 text-small text-ink-2">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-card text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-rule bg-surface-2 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
