"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import { displayPhone, whatsappLink } from "@/lib/format";
import type { Product, SessionUser } from "@/types";

/**
 * El panel de contacto.
 *
 * Es el momento en que la página deja de ser un catálogo y pasa a poner en contacto
 * a dos personas, así que la interfaz dice con claridad qué implica apretar el botón:
 * que el donante se entera, y que ese lugar queda ocupado.
 *
 * El teléfono no está en la página hasta que el servidor lo devuelve. No está oculto
 * con CSS ni dentro del HTML esperando a que alguien mire el código: sencillamente
 * no viajó al navegador.
 */
export function ContactPanel({
  product,
  user,
  alreadyContacted,
}: {
  product: Product;
  user: SessionUser | null;
  alreadyContacted: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { signIn, signingIn } = useAuth();

  const [contact, setContact] = useState<{ phone: string; email: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.uid === product.ownerId;
  const remaining = Math.max(0, product.maxContacts - product.contactCount);

  async function reveal() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${product.id}/contact`, { method: "POST" });
      const payload = (await response.json()) as
        | { ok: true; data: { phone: string; email: string | null } }
        | { ok: false; error: string };

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      setContact({ phone: payload.data.phone, email: payload.data.email });
      toast("Ya tenés el contacto. Escribile para coordinar.");
      router.refresh();
    } catch {
      setError("No hay conexión. Revisá tu internet y probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // --- Sin sesión -----------------------------------------------------------
  if (!user) {
    return (
      <Panel>
        <p className="font-serif text-prose leading-relaxed text-ink-2">
          Para ver el contacto de quien lo regala, entrá con tu cuenta de Google. Es gratis y
          toma unos segundos.
        </p>
        <Button full size="lg" onClick={() => void signIn()} loading={signingIn} className="mt-4">
          Entrar con Google
        </Button>
        <p className="mt-3 text-small text-ink-2">
          Pedimos tu cuenta para que las dos personas sepan con quién están hablando.
        </p>
      </Panel>
    );
  }

  // --- Perfil incompleto ----------------------------------------------------
  if (!user.profileComplete) {
    return (
      <Panel>
        <p className="font-serif text-prose leading-relaxed text-ink-2">
          Te falta completar tu perfil. Necesitamos tu nombre y tu celular para que quien regala
          sepa quién lo está contactando.
        </p>
        <Link
          href="/mi-cuenta?seccion=perfil"
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-card bg-green px-6 text-body font-semibold text-on-green transition-colors hover:bg-green-hover"
        >
          Completar mi perfil
        </Link>
      </Panel>
    );
  }

  // --- Es tu propia publicación --------------------------------------------
  if (isOwner) {
    return (
      <Panel>
        <p className="text-body font-semibold text-ink">Esta mitzvá es tuya</p>
        <p className="mt-1 font-serif text-prose leading-relaxed text-ink-2">
          {product.contactCount === 0
            ? "Todavía no te contactó nadie. Te avisamos por correo cuando alguien pida tu número."
            : `Ya te pidieron el contacto ${product.contactCount} ${product.contactCount === 1 ? "persona" : "personas"}.`}
        </p>
        <Link
          href="/mi-cuenta?seccion=publicaciones"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-card border border-rule-strong bg-surface px-4 text-body font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Administrar mis publicaciones
        </Link>
      </Panel>
    );
  }

  // --- Contacto ya revelado -------------------------------------------------
  if (contact) {
    const message =
      `Hola, te escribo por Mesira. Vi que estás regalando "${product.title}" y me interesa. ` +
      `¿Sigue disponible?`;

    return (
      <Panel className="reveal">
        <p className="text-body font-semibold text-ink">Datos de contacto</p>
        <p className="mt-2 text-h2 font-bold tabular-nums text-ink">{displayPhone(contact.phone)}</p>
        {contact.email ? <p className="mt-1 text-body text-ink-2">{contact.email}</p> : null}

        <a
          href={whatsappLink(contact.phone, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-card bg-green px-6 text-body font-semibold text-on-green transition-colors hover:bg-green-hover"
        >
          Escribir por WhatsApp
        </a>

        <p className="mt-3 font-serif text-prose leading-relaxed text-ink-2">
          Coordinen ustedes dónde y cuándo. Si finalmente no lo vas a buscar, avisale: hay otras
          personas esperando.
        </p>
      </Panel>
    );
  }

  // --- Ya lo habías pedido antes -------------------------------------------
  if (alreadyContacted) {
    return (
      <Panel>
        <p className="text-body font-semibold text-ink">Ya pediste este contacto</p>
        <p className="mt-1 font-serif text-prose leading-relaxed text-ink-2">
          Volver a verlo no ocupa otro lugar.
        </p>
        <Button full size="lg" onClick={() => void reveal()} loading={loading} className="mt-4">
          Ver el contacto otra vez
        </Button>
        {error ? (
          <div className="mt-3">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
      </Panel>
    );
  }

  // --- Cerrada --------------------------------------------------------------
  if (product.status !== "available") {
    return (
      <Panel>
        <p className="text-body font-semibold text-ink">
          {product.status === "delivered" ? "Ya fue entregada" : "Esta publicación se cerró"}
        </p>
        <p className="mt-1 font-serif text-prose leading-relaxed text-ink-2">
          {product.status === "delivered"
            ? "Quien la publicó confirmó que la entregó."
            : "Llegó al límite de contactos. Puede que vuelva a abrirse si no se concreta la entrega."}
        </p>
        <Link
          href="/mi-cuenta?seccion=alertas"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-card border border-rule-strong bg-surface px-4 text-body font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Avisarme si aparece algo parecido
        </Link>
      </Panel>
    );
  }

  // --- Caso normal: pedir el contacto --------------------------------------
  return (
    <Panel>
      <Button full size="lg" onClick={() => void reveal()} loading={loading}>
        Ver el contacto
      </Button>

      <p className="mt-3 font-serif text-prose leading-relaxed text-ink-2">
        Al pedirlo, quien regala recibe un aviso con tu nombre y tu celular, y queda ocupado uno
        de los {product.maxContacts} lugares.{" "}
        {remaining === 1 ? "Es el último que queda." : `Quedan ${remaining}.`}
      </p>

      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </Panel>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-rule bg-surface p-5 ${className ?? ""}`}>{children}</div>
  );
}
