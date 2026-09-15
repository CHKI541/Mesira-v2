import Image from "next/image";
import Link from "next/link";

import { StatusDot } from "@/components/ui/Chip";
import { neighborhoodLabel } from "@/lib/constants";
import { cx } from "@/lib/format";
import type { Product } from "@/types";

/**
 * Tarjeta del tablero.
 *
 * La audacia va acá y en ningún otro lado: la foto ocupa casi toda la tarjeta en
 * proporción 4:5 y todo lo demás está en voz baja debajo. Sin sombra, sin hover que
 * levanta la tarjeta, sin degradado sobre la imagen. Lo único que cambia al pasar el
 * mouse es que el título se subraya, que es lo que indica que es un enlace.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const cover = product.images[0];
  const isAvailable = product.status === "available";
  const remaining = Math.max(0, product.maxContacts - product.contactCount);
  const lastOne = isAvailable && remaining === 1 && product.maxContacts > 1;

  return (
    <article className="group">
      <Link href={`/producto/${product.id}`} className="block rounded-card">
        <div
          className={cx(
            "relative aspect-4/5 overflow-hidden rounded-card border border-rule bg-surface-2",
            !isAvailable && "opacity-65",
          )}
        >
          {cover ? (
            <Image
              src={cover.url}
              alt={product.title}
              fill
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1439px) 25vw, 20vw"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-ink-3">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
                <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {!isAvailable ? (
            <div className="absolute left-2 top-2 rounded-chip bg-surface/95 px-2 py-1">
              <StatusDot status={product.status} />
            </div>
          ) : null}

          {product.images.length > 1 ? (
            <div className="absolute right-2 top-2 rounded-chip bg-ink/70 px-1.5 py-0.5 text-micro font-semibold text-paper tabular-nums">
              {product.images.length}
            </div>
          ) : null}
        </div>

        <h3 className="mt-2 clamp-2 text-h3 font-semibold text-ink underline-offset-2 group-hover:underline">
          {product.title}
        </h3>
      </Link>

      <p className="mt-0.5 clamp-1 text-small text-ink-2">
        {neighborhoodLabel(product.neighborhood, product.customNeighborhood)}
      </p>

      {lastOne ? (
        <p className="mt-1 text-small font-medium text-amber">Queda un lugar para contactar</p>
      ) : null}
    </article>
  );
}

/** Marcador de carga con la misma forma que la tarjeta, para que nada salte. */
export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-4/5 rounded-card" />
      <div className="skeleton mt-2 h-4 w-4/5 rounded-chip" />
      <div className="skeleton mt-1.5 h-3 w-2/5 rounded-chip" />
    </div>
  );
}
