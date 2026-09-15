"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "mesira.introDismissed";

/**
 * Franja de bienvenida.
 *
 * Fina, arriba de todo, y se descarta para siempre. La alternativa habría sido un
 * hero de marketing ocupando la primera pantalla, que es exactamente lo que este
 * diseño decidió no hacer: en un tablero, el contenido es la portada.
 *
 * El estado vive en localStorage, que es una conveniencia por navegador y puede
 * fallar (ventana privada, cookies bloqueadas), así que toda lectura va en try/catch.
 * Se lee con useSyncExternalStore en vez de un efecto: durante el render del servidor
 * devuelve "descartada", y así la franja nunca aparece y desaparece de golpe.
 */

type Listener = () => void;
let listeners: Listener[] = [];

function subscribe(listener: Listener): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** En el servidor no sabemos qué eligió esta persona, así que asumimos descartada. */
function dismissedOnServer(): boolean {
  return true;
}

function dismiss(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Si no se puede guardar, vuelve a aparecer la próxima vez. Es aceptable.
  }
  for (const listener of listeners) listener();
}

export function FirstVisitStrip({ signedIn }: { signedIn: boolean }) {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, dismissedOnServer);

  // Quien ya tiene cuenta no necesita que le expliquen qué es esto.
  if (signedIn || dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-rule py-2.5 text-small">
      <p className="min-w-0 flex-1 text-ink-2">
        Todo lo que está acá se regala. Nadie cobra nada.{" "}
        <Link href="/ayuda" className="font-medium text-ink underline underline-offset-4">
          Cómo funciona
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Entendido, no mostrar más"
        className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-card text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
          <path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
