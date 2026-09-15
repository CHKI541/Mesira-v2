"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cx } from "@/lib/format";

/**
 * Botón.
 *
 * Nota de diseño: el texto de un botón dice exactamente qué pasa al apretarlo
 * ("Publicar la mitzvá", no "Enviar") y nunca lleva una flecha pegada. Ver DESIGN.md.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-green text-on-green hover:bg-green-hover active:bg-green-hover disabled:bg-ink-3 border border-transparent",
  secondary:
    "bg-surface text-ink border border-rule-strong hover:bg-surface-2 active:bg-paper disabled:text-ink-2",
  ghost:
    "bg-transparent text-ink-2 border border-transparent hover:bg-surface-2 hover:text-ink disabled:text-ink-2",
  danger:
    "bg-transparent text-clay border border-clay/35 hover:bg-clay-soft active:bg-clay-soft disabled:text-ink-2",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-small gap-1.5",
  md: "h-11 px-4 text-body gap-2",
  lg: "h-12 px-6 text-body gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-card font-semibold whitespace-nowrap " +
  "transition-colors duration-150 cursor-pointer select-none " +
  "disabled:cursor-not-allowed disabled:opacity-70";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(BASE, VARIANTS[variant], SIZES[size], full && "w-full", className)}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  full = false,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link
      {...rest}
      className={cx(BASE, VARIANTS[variant], SIZES[size], full && "w-full", className)}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("animate-spin shrink-0", className ?? "size-4")}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
