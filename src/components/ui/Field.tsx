"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import { cx } from "@/lib/format";

/**
 * Campos de formulario.
 *
 * La etiqueta va arriba y en sentence case, no en mayúsculas con tracking:
 * ese patrón es uno de los tics más reconocibles de página generada, y además se
 * lee peor. El mensaje de error reemplaza a la ayuda, no se apila debajo.
 */

const CONTROL =
  "w-full rounded-card border bg-surface px-3 text-body text-ink placeholder:text-ink-3 " +
  "transition-colors duration-150 " +
  "focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20 " +
  "disabled:bg-surface-2 disabled:text-ink-2 disabled:cursor-not-allowed";

interface WrapProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: WrapProps) {
  const id = useId();
  const messageId = error || hint ? `${id}-msg` : undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-small font-semibold text-ink">
        {label}
        {required ? <span className="text-clay"> *</span> : null}
      </label>

      {children(id, messageId)}

      {error ? (
        <p id={messageId} role="alert" className="text-small text-clay">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-small text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid,
  className,
  ...rest
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, "h-11", invalid ? "border-clay" : "border-rule-strong", className)}
    />
  );
}

export function TextArea({
  invalid,
  className,
  ...rest
}: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={cx(
        CONTROL,
        "min-h-28 resize-y py-2.5 font-serif text-prose leading-relaxed",
        invalid ? "border-clay" : "border-rule-strong",
        className,
      )}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      {...rest}
      aria-invalid={invalid || undefined}
      className={cx(
        CONTROL,
        "h-11 cursor-pointer appearance-none bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
        invalid ? "border-clay" : "border-rule-strong",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5l5-5' stroke='%235C6E77' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
      }}
    >
      {children}
    </select>
  );
}

/** Casilla con su texto al lado, todo clicable. */
export function Checkbox({
  label,
  description,
  className,
  ...rest
}: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-2.5 py-1 select-none",
        rest.disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        {...rest}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-chip border-rule-strong accent-green"
      />
      <span className="min-w-0">
        <span className="block text-body text-ink">{label}</span>
        {description ? <span className="block text-small text-ink-2">{description}</span> : null}
      </span>
    </label>
  );
}

/** Interruptor para preferencias que se aplican al instante. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-body font-medium text-ink">{label}</p>
        {description ? <p className="mt-0.5 text-small text-ink-2">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === "string" ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-dot border transition-colors duration-150",
          checked ? "border-green bg-green" : "border-rule-strong bg-surface-2",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 size-4.5 rounded-dot bg-white shadow-sm transition-[left] duration-150",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
