import "server-only";

import { randomUUID } from "crypto";

import { adminBucket } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/auth/session";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import type { ProductImage } from "@/types";

/**
 * Subida de imágenes a Firebase Storage, desde el servidor.
 *
 * Dos decisiones importantes respecto de la versión anterior:
 *
 * 1. Las fotos ya no se guardan como base64 dentro del documento de Firestore.
 *    Eso hacía que cada lectura del tablero bajara megabytes de imágenes incrustadas,
 *    que el documento rozara el límite de 1 MB, y que no hubiera forma de servirlas
 *    optimizadas ni cacheadas.
 *
 * 2. El navegador no escribe en Storage. Manda la imagen ya comprimida al servidor,
 *    que valida tipo y peso y recién ahí la escribe. Por eso storage.rules no tiene
 *    ningún `allow write`.
 */

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

interface DecodedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

function decodeDataUrl(dataUrl: string): DecodedImage {
  const match = DATA_URL.exec(dataUrl);
  if (!match) {
    throw new ApiError(422, "Formato de imagen no admitido. Usá JPG, PNG o WebP.");
  }

  const contentType = match[1]!;
  if (!ACCEPTED_IMAGE_TYPES.includes(contentType as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new ApiError(422, "Formato de imagen no admitido. Usá JPG, PNG o WebP.");
  }

  const buffer = Buffer.from(match[2]!, "base64");
  if (buffer.byteLength === 0) {
    throw new ApiError(422, "Una de las fotos llegó vacía. Probá subirla de nuevo.");
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ApiError(413, "Una de las fotos pesa demasiado. Probá con una imagen más chica.");
  }

  // Verificación por número mágico: que el data URL diga "image/jpeg" no significa
  // que lo sea. Esto evita que alguien suba un archivo arbitrario disfrazado.
  if (!looksLikeImage(buffer, contentType)) {
    throw new ApiError(422, "El archivo no parece ser una imagen válida.");
  }

  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return { buffer, contentType, extension };
}

function looksLikeImage(buffer: Buffer, contentType: string): boolean {
  if (buffer.byteLength < 12) return false;

  if (contentType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    return (
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
      buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
    );
  }
  if (contentType === "image/webp") {
    return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export interface IncomingImage {
  dataUrl: string;
  width: number;
  height: number;
}

/** Sube una tanda de imágenes y devuelve sus URLs públicas. */
export async function uploadProductImages(
  productId: string,
  images: IncomingImage[],
): Promise<ProductImage[]> {
  const bucket = adminBucket();

  const uploads = images.map(async (image, index): Promise<ProductImage> => {
    const { buffer, contentType, extension } = decodeDataUrl(image.dataUrl);
    const token = randomUUID();
    const path = `products/${productId}/${Date.now()}-${index}-${token.slice(0, 8)}.${extension}`;
    const file = bucket.file(path);

    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        // El token es lo que hace que la URL de descarga sea pública pero no adivinable.
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const url =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
      `${encodeURIComponent(path)}?alt=media&token=${token}`;

    return { url, path, width: image.width, height: image.height };
  });

  return Promise.all(uploads);
}

/** Borra archivos de Storage sin hacer fallar la operación principal si alguno no está. */
export async function deleteImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const bucket = adminBucket();

  await Promise.all(
    paths.map(async (path) => {
      if (!path.startsWith("products/")) return;
      try {
        await bucket.file(path).delete({ ignoreNotFound: true });
      } catch (error) {
        console.error(`[images] no se pudo borrar ${path}:`, error);
      }
    }),
  );
}
