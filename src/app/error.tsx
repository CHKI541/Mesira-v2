"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Límite de error global.
 *
 * No muestra el mensaje técnico: puede contener rutas internas o nombres de
 * colecciones. Lo registra en la consola del servidor y le ofrece a la persona lo
 * único que le sirve, que es volver a intentar.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] error no controlado:", error);
  }, [error]);

  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@mesira.net";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-20 sm:px-6">
      <h1 className="text-display font-extrabold text-ink">Algo se rompió acá</h1>
      <p className="prose-mesira mt-3 text-ink-2">
        No es culpa tuya. Probá de nuevo; si vuelve a pasar, escribinos a {support} y contanos qué
        estabas haciendo.
      </p>

      {error.digest ? (
        <p className="mt-4 text-small text-ink-2">
          Código del error: <span className="tabular-nums">{error.digest}</span>
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 cursor-pointer items-center rounded-card bg-green px-6 text-body font-semibold text-on-green transition-colors hover:bg-green-hover"
        >
          Probar de nuevo
        </button>
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-card border border-rule-strong bg-surface px-6 text-body font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Ir al tablero
        </Link>
      </div>
    </div>
  );
}
