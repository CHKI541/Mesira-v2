"use client";

import type { ReactNode } from "react";

import { cx } from "@/lib/format";
import type { ProductStatus } from "@/lib/constants";

/** Chip de filtro. Seleccionado = tinta llena; sin seleccionar = solo un filete. */
export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-chip border px-3 text-small font-medium",
        "transition-colors duration-150 cursor-pointer whitespace-nowrap",
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule-strong bg-surface text-ink-2 hover:border-ink-2 hover:text-ink",
      )}
    >
      {children}
      {typeof count === "number" && count > 0 ? (
        <span className={cx("text-micro tabular-nums", active ? "text-paper/70" : "text-ink-2")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Chip de filtro activo, con su cruz para sacarlo. */
export function RemovableChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-chip border border-rule-strong bg-surface pl-2.5 pr-1 text-small text-ink">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar el filtro ${typeof children === "string" ? children : ""}`}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-chip text-ink-2 transition-colors hover:bg-paper hover:text-clay"
      >
        <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
          <path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}

/**
 * Indicador de estado.
 *
 * Es el único lugar de la interfaz donde aparece un color saturado sin que sea una
 * acción, y por eso funciona: cuando ves verde, sabés que está disponible.
 */
export function StatusDot({
  status,
  withLabel = true,
  className,
}: {
  status: ProductStatus;
  withLabel?: boolean;
  className?: string;
}) {
  const config: Record<ProductStatus, { dot: string; text: string; label: string }> = {
    available: { dot: "bg-green", text: "text-green-ink", label: "Disponible" },
    closed: { dot: "bg-amber", text: "text-amber", label: "Cerrada" },
    delivered: { dot: "bg-ink-3", text: "text-ink-2", label: "Entregada" },
    removed: { dot: "bg-clay", text: "text-clay", label: "Dada de baja" },
  };
  const c = config[status];

  return (
    <span className={cx("inline-flex items-center gap-1.5", className)}>
      <span className={cx("size-1.5 shrink-0 rounded-dot", c.dot)} aria-hidden="true" />
      {withLabel ? <span className={cx("text-small font-medium", c.text)}>{c.label}</span> : null}
      {!withLabel ? <span className="sr-only">{c.label}</span> : null}
    </span>
  );
}

/** Aviso en línea: confirmación, advertencia o error. */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "error";
  children: ReactNode;
}) {
  const tones = {
    info: "border-rule-strong bg-surface-2 text-ink",
    success: "border-green/30 bg-green-soft text-green-ink",
    warning: "border-amber/30 bg-amber-soft text-amber",
    error: "border-clay/30 bg-clay-soft text-clay",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("rounded-card border px-3.5 py-3 text-body", tones[tone])}
    >
      {children}
    </div>
  );
}
