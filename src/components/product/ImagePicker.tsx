"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Spinner } from "@/components/ui/Button";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/constants";
import { ImageError, compressImage, type CompressedImage } from "@/lib/compress";
import { cx } from "@/lib/format";

export interface PickedImage extends CompressedImage {
  id: string;
}

/** Foto que ya está publicada y se puede conservar o quitar. */
export interface ExistingImage {
  path: string;
  url: string;
}

/**
 * Selector de fotos.
 *
 * Comprime al elegir, no al enviar: así la persona ve enseguida si una foto falla,
 * en lugar de esperar a que el formulario entero se rechace un minuto después.
 */
export function ImagePicker({
  existing,
  onExistingChange,
  images,
  onChange,
}: {
  existing?: ExistingImage[];
  onExistingChange?: (next: ExistingImage[]) => void;
  images: PickedImage[];
  onChange: (next: PickedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingCount = existing?.length ?? 0;
  const total = existingCount + images.length;
  const room = MAX_IMAGES_PER_PRODUCT - total;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setError(null);
    setWorking(true);

    const files = Array.from(fileList).slice(0, Math.max(0, room));
    const added: PickedImage[] = [];

    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        added.push({ ...compressed, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      } catch (err) {
        setError(err instanceof ImageError ? err.message : "No pudimos procesar una de las fotos.");
      }
    }

    if (added.length > 0) onChange([...images, ...added]);
    setWorking(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-small font-semibold text-ink">
          Fotos <span className="text-clay">*</span>
        </p>
        <p className="text-small text-ink-2 tabular-nums">
          {total} de {MAX_IMAGES_PER_PRODUCT}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {existing?.map((image) => (
          <Thumb
            key={image.path}
            src={image.url}
            onRemove={() => onExistingChange?.(existing.filter((i) => i.path !== image.path))}
          />
        ))}

        {images.map((image) => (
          <Thumb
            key={image.id}
            src={image.dataUrl}
            onRemove={() => onChange(images.filter((i) => i.id !== image.id))}
          />
        ))}

        {room > 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={working}
            className={cx(
              "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5",
              "rounded-card border border-dashed border-rule-strong bg-surface-2 text-ink-2",
              "transition-colors hover:border-green hover:text-green disabled:cursor-wait",
            )}
          >
            {working ? (
              <Spinner className="size-5" />
            ) : (
              <>
                <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                <span className="text-small font-medium">
                  {total === 0 ? "Agregar foto" : "Otra"}
                </span>
              </>
            )}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <p className="mt-2 text-small text-ink-2">
        {error ? (
          <span className="text-clay">{error}</span>
        ) : (
          "Sacale una foto con buena luz. La primera es la que se ve en el tablero."
        )}
      </p>
    </div>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-card border border-rule bg-surface-2">
      {/* La vista previa local es un data URL, así que no pasa por el optimizador. */}
      {src.startsWith("data:") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Image src={src} alt="" fill sizes="120px" className="object-cover" />
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar esta foto"
        className="absolute right-1 top-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-card bg-ink/75 text-paper transition-colors hover:bg-clay"
      >
        <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
          <path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
