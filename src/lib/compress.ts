"use client";

import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";

/**
 * Compresión de imágenes en el navegador, antes de subirlas.
 *
 * Una foto de celular pesa entre 3 y 8 MB. Subirla entera con datos móviles tarda
 * y falla seguido, y no aporta nada: en el tablero se ve a 400px de ancho.
 *
 * El proceso baja el lado más largo a 1400px, exporta a JPEG y, si aún así pesa
 * demasiado, vuelve a intentar con menos calidad. También respeta la orientación
 * EXIF, que es por qué algunas fotos de iPhone aparecían acostadas.
 */

const MAX_DIMENSION = 1400;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45];

export interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export class ImageError extends Error {}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new ImageError("Solo se pueden subir fotos JPG, PNG o WebP.");
  }
  // 25 MB de archivo original: más que eso probablemente no sea una foto.
  if (file.size > 25 * 1024 * 1024) {
    throw new ImageError("Esa foto es demasiado grande. Probá con otra.");
  }

  const bitmap = await loadBitmap(file);

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new ImageError("Tu navegador no pudo procesar la foto.");

    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const bytes = Math.ceil(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);
      if (bytes <= MAX_IMAGE_BYTES) {
        return { dataUrl, width, height, bytes };
      }
    }

    throw new ImageError("No pudimos achicar esa foto lo suficiente. Probá con otra.");
  } finally {
    bitmap.close?.();
  }
}

/**
 * createImageBitmap con `imageOrientation: "from-image"` aplica la rotación EXIF.
 * Si el navegador no lo soporta, cae al camino clásico con <img>.
 */
async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Sigue con el camino alternativo.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new ImageError("No pudimos leer esa foto."));
      element.src = url;
    });
    return await createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}
