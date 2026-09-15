import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb, COLLECTIONS } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/auth/session";

/**
 * Límite de frecuencia por usuario y acción.
 *
 * Se guarda en Firestore y no en memoria porque en Vercel cada request puede caer
 * en una instancia distinta, así que un contador en memoria no limita nada. El costo
 * es una escritura por acción protegida, que para el volumen de Mesira es irrelevante.
 *
 * La versión anterior no tenía ningún límite: cualquier cuenta podía crear
 * publicaciones o pedir contactos en bucle.
 */

interface Rule {
  /** Cuántas veces se permite dentro de la ventana. */
  limit: number;
  /** Tamaño de la ventana en milisegundos. */
  windowMs: number;
  /** Qué se le dice a la persona cuando se pasa. */
  message: string;
}

export const RATE_RULES = {
  createProduct: {
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
    message: "Llegaste al máximo de publicaciones por hoy. Probá de nuevo mañana.",
  },
  revealContact: {
    limit: 40,
    windowMs: 60 * 60 * 1000,
    message: "Pediste muchos contactos en poco tiempo. Esperá un rato y volvé a intentar.",
  },
  createAlert: {
    limit: 20,
    windowMs: 60 * 60 * 1000,
    message: "Creaste muchas alertas seguidas. Esperá un rato.",
  },
  report: {
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
    message: "Ya enviaste varios reportes hoy. Gracias, los estamos revisando.",
  },
  updateProfile: {
    limit: 30,
    windowMs: 60 * 60 * 1000,
    message: "Guardaste el perfil demasiadas veces seguidas. Esperá un momento.",
  },
  session: {
    limit: 30,
    windowMs: 10 * 60 * 1000,
    message: "Demasiados intentos de inicio de sesión. Esperá unos minutos.",
  },
} as const satisfies Record<string, Rule>;

export type RateAction = keyof typeof RATE_RULES;

/**
 * Consume una unidad del cupo. Tira 429 si ya no queda.
 * `subject` es normalmente el uid; para acciones sin sesión puede ser una IP.
 */
export async function consumeRate(action: RateAction, subject: string): Promise<void> {
  const rule = RATE_RULES[action];
  const now = Date.now();
  const docId = `${action}__${subject}`.replace(/[/]/g, "_").slice(0, 400);
  const ref = adminDb().collection(COLLECTIONS.rateLimits).doc(docId);

  try {
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data();
      const windowStart = typeof data?.windowStart === "number" ? data.windowStart : 0;
      const count = typeof data?.count === "number" ? data.count : 0;

      if (!snap.exists || now - windowStart >= rule.windowMs) {
        tx.set(ref, { windowStart: now, count: 1, action, updatedAt: FieldValue.serverTimestamp() });
        return;
      }

      if (count >= rule.limit) {
        throw new ApiError(429, rule.message);
      }

      tx.update(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() });
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Si el contador falla por un problema de infraestructura, no bloqueamos a la
    // persona: es preferible dejar pasar la acción que romper la app entera.
    console.error("[rate-limit] no se pudo actualizar el contador:", error);
  }
}

/** IP del pedido, para limitar acciones que no tienen usuario todavía. */
export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}
