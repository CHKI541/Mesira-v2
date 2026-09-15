"use client";

import Image from "next/image";
import { useState } from "react";

import { cx } from "@/lib/format";
import type { ProductImage } from "@/types";

/**
 * Galería de fotos.
 *
 * En el celular la foto va de borde a borde: es la audacia que el diseño reserva
 * para la imagen. Las miniaturas solo aparecen si hay más de una.
 */
export function Gallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  if (!current) {
    return (
      <div className="flex aspect-4/3 items-center justify-center rounded-card border border-rule bg-surface-2 text-ink-2">
        Sin foto
      </div>
    );
  }

  return (
    <div>
      <div className="relative -mx-4 aspect-4/3 overflow-hidden border-y border-rule bg-surface-2 sm:mx-0 sm:rounded-card sm:border">
        <Image
          src={current.url}
          alt={images.length > 1 ? `${title}, foto ${index + 1} de ${images.length}` : title}
          fill
          sizes="(max-width: 1023px) 100vw, 640px"
          className="object-contain"
          priority
        />
      </div>

      {images.length > 1 ? (
        <div className="scroll-rail scroll-rail-hide mt-3 flex gap-2">
          {images.map((image, i) => (
            <button
              key={image.path || i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver la foto ${i + 1}`}
              aria-current={i === index}
              className={cx(
                "relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-card border transition-colors",
                i === index ? "border-ink" : "border-rule hover:border-ink-2",
              )}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
