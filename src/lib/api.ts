import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ApiError } from "@/lib/auth/session";
import { firstIssue } from "@/lib/validation";

/**
 * Contrato único de respuesta de todas las rutas de /api.
 *
 * La versión anterior devolvía a veces JSON, a veces una página de error HTML de
 * Next, y el cliente tenía que inspeccionar el content-type en cada llamada para
 * no explotar al parsear. Acá siempre sale JSON con la misma forma.
 */

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Envuelve el handler de una ruta y traduce cualquier excepción a JSON.
 * Nunca deja escapar el mensaje interno de un error inesperado al cliente: eso
 * filtra rutas de archivos, nombres de colecciones y a veces credenciales.
 */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.status, error.message);
    }
    if (error instanceof ZodError) {
      return fail(422, firstIssue(error));
    }
    if (error instanceof SyntaxError) {
      return fail(400, "El pedido no tiene un cuerpo JSON válido.");
    }
    console.error("[api] error no controlado:", error);
    return fail(500, "Algo falló de nuestro lado. Probá de nuevo en un momento.");
  }
}

/** Lee el JSON del cuerpo con un tope de tamaño, para no cargar 50 MB en memoria. */
export async function readJson(request: Request, maxBytes = 6 * 1024 * 1024): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > maxBytes) {
    throw new ApiError(413, "El contenido es demasiado grande. Probá con fotos más livianas.");
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new ApiError(413, "El contenido es demasiado grande. Probá con fotos más livianas.");
  }
  if (!text) return {};
  return JSON.parse(text) as unknown;
}
