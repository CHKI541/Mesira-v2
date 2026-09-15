import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb, COLLECTIONS } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/auth/session";
import { MAX_ALERTS_PER_USER } from "@/lib/constants";
import { normalize, toMillis } from "@/lib/format";
import type { Alert, Product } from "@/types";
import type { AlertInput } from "@/lib/validation";

/** Alertas de palabra clave. Solo servidor. */

function fromDoc(id: string, data: FirebaseFirestore.DocumentData): Alert {
  return {
    id,
    userId: String(data.userId ?? ""),
    keyword: String(data.keyword ?? ""),
    categories: Array.isArray(data.categories) ? data.categories : [],
    neighborhoods: Array.isArray(data.neighborhoods) ? data.neighborhoods : [],
    conditions: Array.isArray(data.conditions) ? data.conditions : [],
    channel: data.channel === "push" || data.channel === "both" ? data.channel : "email",
    createdAt: toMillis(data.createdAt),
  };
}

export async function getUserAlerts(userId: string): Promise<Alert[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.alerts)
    .where("userId", "==", userId)
    .limit(MAX_ALERTS_PER_USER + 5)
    .get();

  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createAlert(userId: string, input: AlertInput): Promise<Alert> {
  const existing = await getUserAlerts(userId);
  if (existing.length >= MAX_ALERTS_PER_USER) {
    throw new ApiError(
      409,
      `Llegaste al máximo de ${MAX_ALERTS_PER_USER} alertas. Borrá alguna para crear otra.`,
    );
  }

  const ref = await adminDb()
    .collection(COLLECTIONS.alerts)
    .add({
      userId,
      keyword: input.keyword.trim(),
      categories: input.categories,
      neighborhoods: input.neighborhoods,
      conditions: input.conditions,
      channel: input.channel,
      createdAt: FieldValue.serverTimestamp(),
    });

  const snap = await ref.get();
  return fromDoc(ref.id, snap.data()!);
}

export async function deleteAlert(userId: string, alertId: string): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.alerts).doc(alertId);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, "Esa alerta ya no existe.");
  if (snap.data()?.userId !== userId) throw new ApiError(403, "Esa alerta no es tuya.");
  await ref.delete();
}

export async function countAlerts(): Promise<number> {
  const snap = await adminDb().collection(COLLECTIONS.alerts).count().get();
  return snap.data().count;
}

/** Devuelve las alertas que coinciden con una publicación recién creada. */
export async function findMatchingAlerts(product: Product): Promise<Alert[]> {
  const snap = await adminDb().collection(COLLECTIONS.alerts).limit(5000).get();
  const haystack = normalize(`${product.title} ${product.description}`);

  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((alert) => {
      // El dueño no recibe alertas de su propia publicación.
      if (alert.userId === product.ownerId) return false;

      if (alert.keyword.trim()) {
        const words = normalize(alert.keyword).split(/\s+/).filter(Boolean);
        if (!words.every((w) => haystack.includes(w))) return false;
      }
      if (alert.categories.length > 0) {
        if (!product.categories.some((c) => alert.categories.includes(c))) return false;
      }
      if (alert.neighborhoods.length > 0) {
        if (!alert.neighborhoods.includes(product.neighborhood)) return false;
      }
      if (alert.conditions.length > 0) {
        if (!alert.conditions.includes(product.condition)) return false;
      }
      return true;
    });
}

export type { Alert };
