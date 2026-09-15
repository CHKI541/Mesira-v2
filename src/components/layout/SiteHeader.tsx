"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cx } from "@/lib/format";
import type { SessionUser } from "@/types";

/**
 * Barra superior.
 *
 * Tres cosas y nada más: volver al tablero, buscar, y tu cuenta. El botón de
 * publicar es la única acción destacada porque es la que hace que el tablero exista.
 */
export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const isFeed = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        {/* En el tablero, el celular necesita todo el ancho para buscar, así que
            ahí la marca queda reducida al glifo. En el resto de las páginas va entera. */}
        <Link
          href="/"
          className="shrink-0 rounded-card text-ink transition-opacity hover:opacity-70"
          aria-label="Mesira, ir al tablero"
        >
          <Logo hideWordmarkOnMobile={isFeed} />
        </Link>

        {isFeed ? <SearchBox /> : <div className="flex-1" />}

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/publicar"
            className="hidden h-9 items-center rounded-card bg-green px-3.5 text-small font-semibold text-on-green transition-colors hover:bg-green-hover sm:inline-flex"
          >
            Publicar
          </Link>
          <Link
            href="/publicar"
            aria-label="Publicar una mitzvá"
            className="inline-flex size-9 items-center justify-center rounded-card bg-green text-on-green transition-colors hover:bg-green-hover sm:hidden"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </Link>

          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}

function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();

  const query = params.get("q") ?? "";
  const [value, setValue] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);

  // Si la búsqueda cambia desde otro lado (el botón de limpiar, el historial del
  // navegador), el campo tiene que reflejarlo. Este es el patrón que recomienda React
  // para ajustar estado cuando cambia una prop: se corrige durante el render, sin un
  // efecto que dispare un segundo render en cascada.
  if (query !== lastQuery) {
    setLastQuery(query);
    setValue(query);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    const query = value.trim();
    if (query) next.set("q", query);
    else next.delete("q");
    next.delete("pagina");
    router.push(next.toString() ? `/?${next}` : "/");
  }

  return (
    <form onSubmit={submit} role="search" className="min-w-0 flex-1">
      <label htmlFor="buscador" className="sr-only">
        Buscar un artículo
      </label>
      <div className="relative">
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id="buscador"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Buscar en el tablero"
          className="h-9 w-full rounded-card border border-rule-strong bg-surface pl-9 pr-3 text-body text-ink placeholder:text-ink-3 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
        />
      </div>
    </form>
  );
}

function AccountMenu({ user }: { user: SessionUser | null }) {
  const { signIn, signingIn, signOutNow } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <Button size="sm" variant="secondary" onClick={() => void signIn()} loading={signingIn}>
        Entrar
      </Button>
    );
  }

  const initials =
    user.profile?.firstName?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tu cuenta"
        className={cx(
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-card border text-small font-bold transition-colors",
          open
            ? "border-ink bg-ink text-paper"
            : "border-rule-strong bg-surface text-ink hover:border-ink-2",
        )}
      >
        {initials}
      </button>

      {open ? (
        <div
          role="menu"
          className="reveal absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-card border border-rule bg-surface shadow-lg"
        >
          <div className="border-b border-rule px-4 py-3">
            <p className="truncate text-body font-semibold text-ink">
              {user.profile?.firstName
                ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
                : "Tu cuenta"}
            </p>
            <p className="truncate text-small text-ink-2">{user.email}</p>
          </div>

          {!user.profileComplete ? (
            <Link
              href="/mi-cuenta?seccion=perfil"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block border-b border-rule bg-amber-soft px-4 py-3 text-small text-amber"
            >
              Completá tu perfil para publicar y contactar
            </Link>
          ) : null}

          <nav className="py-1">
            <MenuLink href="/mi-cuenta?seccion=publicaciones" onClick={() => setOpen(false)}>
              Mis publicaciones
            </MenuLink>
            <MenuLink href="/mi-cuenta?seccion=alertas" onClick={() => setOpen(false)}>
              Mis alertas
            </MenuLink>
            <MenuLink href="/mi-cuenta?seccion=perfil" onClick={() => setOpen(false)}>
              Mi perfil
            </MenuLink>
            {user.isAdmin ? (
              <MenuLink href="/admin" onClick={() => setOpen(false)}>
                Moderación
              </MenuLink>
            ) : null}
          </nav>

          <div className="border-t border-rule p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOutNow();
              }}
              className="w-full cursor-pointer rounded-card px-3 py-2 text-left text-body text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block px-4 py-2 text-body text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </Link>
  );
}
