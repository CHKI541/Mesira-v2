import Link from "next/link";

import { Logo } from "@/components/layout/Logo";

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@mesira.net";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule bg-surface">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo className="text-ink" />
            <p className="mt-3 font-serif text-prose leading-relaxed text-ink-2">
              Un tablero de la comunidad judía argentina para que lo que a uno le sobra
              llegue a quien lo necesita. Todo es gratis, siempre.
            </p>
          </div>

          <nav aria-label="Enlaces del pie" className="flex flex-col gap-2.5 text-body">
            <Link href="/ayuda" className="text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Cómo funciona
            </Link>
            <Link href="/terminos" className="text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Términos de uso
            </Link>
            <Link href="/privacidad" className="text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Privacidad
            </Link>
            <a
              href={`mailto:${SUPPORT}`}
              className="text-ink-2 underline-offset-4 hover:text-ink hover:underline"
            >
              {SUPPORT}
            </a>
          </nav>
        </div>

        <p className="mt-10 border-t border-rule pt-6 text-small text-ink-2">
          Mesira Argentina. Publicar y contactar es gratis; la entrega la coordinan las personas
          entre ellas.
        </p>
      </div>
    </footer>
  );
}
