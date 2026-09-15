"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Notice, StatusDot } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { CLOSED_VISIBLE_HOURS, neighborhoodLabel } from "@/lib/constants";
import { hoursUntil, relativeTime } from "@/lib/format";
import type { Product } from "@/types";

/**
 * Publicaciones propias.
 *
 * Cada fila muestra el estado real y solo las acciones que tienen sentido para ese
 * estado. Antes se mostraban todos los botones siempre y varios fallaban en silencio.
 */
export function MyListings({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="max-w-lg py-10">
        <h2 className="text-h2 font-bold text-ink">Todavía no publicaste nada</h2>
        <p className="mt-2 font-serif text-prose leading-relaxed text-ink-2">
          Si tenés algo guardado que está en buen estado y no usás, alguien de la comunidad
          probablemente lo necesita ahora mismo.
        </p>
        <ButtonLink href="/publicar" size="lg" className="mt-5">
          Publicar una mitzvá
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {products.map((product) => (
        <ListingRow key={product.id} product={product} />
      ))}
    </ul>
  );
}

function ListingRow({ product }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cover = product.images[0];
  const closedAt = product.closedAt ?? product.updatedAt;
  const disappearsIn = hoursUntil(closedAt + CLOSED_VISIBLE_HOURS * 3_600_000);

  async function act(action: "close" | "reopen" | "deliver", successMessage: string) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/products/${product.id}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setError(payload.error ?? "No se pudo completar la acción.");
        return;
      }
      toast(successMessage);
      router.refresh();
    } catch {
      setError("No hay conexión. Probá de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setError(payload.error ?? "No se pudo borrar.");
        return;
      }
      setConfirmDelete(false);
      toast("Publicación borrada.");
      router.refresh();
    } catch {
      setError("No hay conexión. Probá de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="border-b border-rule py-5 first:pt-0">
      <div className="flex gap-4">
        <Link
          href={`/producto/${product.id}`}
          className="relative size-20 shrink-0 overflow-hidden rounded-card border border-rule bg-surface-2 sm:size-24"
        >
          {cover ? (
            <Image src={cover.url} alt="" fill sizes="96px" className="object-cover" />
          ) : null}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusDot status={product.status} />
            <span className="text-small text-ink-2">{relativeTime(product.createdAt)}</span>
          </div>

          <h3 className="mt-1">
            <Link
              href={`/producto/${product.id}`}
              className="clamp-1 text-h3 font-semibold text-ink underline-offset-2 hover:underline"
            >
              {product.title}
            </Link>
          </h3>

          <p className="mt-0.5 text-small text-ink-2">
            {neighborhoodLabel(product.neighborhood, product.customNeighborhood)}
          </p>

          <p className="mt-1.5 text-small text-ink-2 tabular-nums">
            {product.contactCount} de {product.maxContacts}{" "}
            {product.contactCount === 1 ? "contacto" : "contactos"}
            {product.viewCount > 0
              ? `, ${product.viewCount} ${product.viewCount === 1 ? "vista" : "vistas"}`
              : ""}
          </p>

          {product.status === "closed" && disappearsIn > 0 ? (
            <p className="mt-1 text-small text-amber">
              Se va del tablero en {disappearsIn} {disappearsIn === 1 ? "hora" : "horas"}.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {product.status === "available" ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy === "deliver"}
                  onClick={() => void act("deliver", "Marcada como entregada. Mazal tov.")}
                >
                  Ya la entregué
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busy === "close"}
                  onClick={() => void act("close", "Publicación pausada.")}
                >
                  Pausar
                </Button>
              </>
            ) : null}

            {product.status === "closed" || product.status === "delivered" ? (
              <Button
                size="sm"
                variant="secondary"
                loading={busy === "reopen"}
                onClick={() => void act("reopen", "Volvió al tablero como nueva.")}
              >
                Volver a publicar
              </Button>
            ) : null}

            {product.status !== "removed" ? (
              <ButtonLink size="sm" variant="ghost" href={`/producto/${product.id}/editar`}>
                Editar
              </ButtonLink>
            ) : null}

            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
              Borrar
            </Button>
          </div>

          {product.status === "removed" ? (
            <div className="mt-3">
              <Notice tone="error">
                La moderación dio de baja esta publicación. Escribinos si creés que fue un error.
              </Notice>
            </div>
          ) : null}

          {error ? (
            <div className="mt-3">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Borrar esta publicación?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              No, dejarla
            </Button>
            <Button variant="danger" loading={busy === "delete"} onClick={() => void remove()}>
              Sí, borrarla
            </Button>
          </>
        }
      >
        <p className="font-serif text-prose leading-relaxed text-ink">
          Se borra <strong>{product.title}</strong> con todas sus fotos, y no se puede recuperar.
        </p>
        <p className="mt-3 font-serif text-prose leading-relaxed text-ink-2">
          Si solo querés que deje de aparecer, es mejor pausarla: así la podés volver a publicar
          más adelante sin cargar todo de nuevo.
        </p>
      </Dialog>
    </li>
  );
}
