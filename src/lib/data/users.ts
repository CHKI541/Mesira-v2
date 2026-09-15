import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb, COLLECTIONS } from "@/lib/firebase/admin";
import { toMillis } from "@/lib/format";
import type { UserProfile } from "@/types";

/** Perfiles de usuario. Solo servidor. */

function fromDoc(uid: string, data: FirebaseFirestore.DocumentData): UserProfile {
  return {
    uid,
    email: String(data.email ?? ""),
    firstName: String(data.firstName ?? ""),
    lastName: String(data.lastName ?? ""),
    phone: String(data.phone ?? ""),
    kehila: String(data.kehila ?? ""),
    neighborhood: data.neighborhood ?? null,
    notifyMode: data.notifyMode === "all" || data.notifyMode === "none" ? data.notifyMode : "alerts",
    notifyByEmail: data.notifyByEmail !== false,
    notifyByPush: data.notifyByPush === true,
    disabled: data.disabled === true,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
  return snap.exists ? fromDoc(uid, snap.data()!) : null;
}

/**
 * Crea el documento del usuario si no existe. Se llama al iniciar sesión.
 * Nunca pisa los datos que la persona ya cargó: usa merge y solo completa vacíos.
 */
export async function ensureProfile(
  uid: string,
  email: string,
  displayName: string | null,
): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.users).doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    // Mantenemos el email sincronizado con el de la cuenta de Google.
    if (email && snap.data()?.email !== email) {
      await ref.update({ email, updatedAt: FieldValue.serverTimestamp() });
    }
    return;
  }

  // Un nombre de Google se usa solo como sugerencia inicial para el formulario.
  const parts = (displayName ?? "").trim().split(/\s+/);
  const firstName = parts.length > 0 ? (parts[0] ?? "") : "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

  await ref.set({
    email,
    firstName,
    lastName,
    phone: "",
    kehila: "",
    neighborhood: null,
    notifyMode: "alerts",
    notifyByEmail: true,
    notifyByPush: false,
    disabled: false,
    fcmTokens: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateProfile(
  uid: string,
  data: FirebaseFirestore.DocumentData,
): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(uid)
    .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function setPushToken(
  uid: string,
  token: string,
  action: "add" | "remove",
): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(uid)
    .update({
      fcmTokens: action === "add" ? FieldValue.arrayUnion(token) : FieldValue.arrayRemove(token),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/** Saca de la base tokens de push que FCM ya rechazó (apps desinstaladas). */
export async function prunePushTokens(tokensByUser: Map<string, string[]>): Promise<void> {
  const batch = adminDb().batch();
  for (const [uid, tokens] of tokensByUser) {
    if (tokens.length === 0) continue;
    batch.update(adminDb().collection(COLLECTIONS.users).doc(uid), {
      fcmTokens: FieldValue.arrayRemove(...tokens),
    });
  }
  await batch.commit();
}

export interface AdminUserRow extends UserProfile {
  productCount: number;
}

/** Lista para el panel de moderación, con el conteo de publicaciones de cada uno. */
export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const [usersSnap, productsSnap] = await Promise.all([
    adminDb().collection(COLLECTIONS.users).orderBy("createdAt", "desc").limit(1000).get(),
    adminDb().collection(COLLECTIONS.products).select("ownerId").limit(5000).get(),
  ]);

  const counts = new Map<string, number>();
  for (const doc of productsSnap.docs) {
    const ownerId = doc.data().ownerId as string | undefined;
    if (ownerId) counts.set(ownerId, (counts.get(ownerId) ?? 0) + 1);
  }

  return usersSnap.docs.map((doc) => ({
    ...fromDoc(doc.id, doc.data()),
    productCount: counts.get(doc.id) ?? 0,
  }));
}

/**
 * Deshabilita o rehabilita una cuenta.
 * Marca el documento y además bloquea la cuenta en Firebase Auth y revoca sus tokens,
 * para que la sesión abierta se caiga en el próximo pedido en vez de seguir viva.
 */
export async function setUserDisabled(uid: string, disabled: boolean): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(uid)
    .update({ disabled, updatedAt: FieldValue.serverTimestamp() });

  await adminAuth().updateUser(uid, { disabled });
  if (disabled) {
    await adminAuth().revokeRefreshTokens(uid);
  }
}

/** Todos los usuarios que deberían recibir un aviso por un producto nuevo. */
export interface NotifiableUser {
  uid: string;
  email: string;
  firstName: string;
  notifyMode: UserProfile["notifyMode"];
  notifyByEmail: boolean;
  notifyByPush: boolean;
  fcmTokens: string[];
}

export async function getNotifiableUsers(): Promise<NotifiableUser[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.users)
    .where("disabled", "==", false)
    .limit(5000)
    .get();

  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: String(data.email ?? ""),
        firstName: String(data.firstName ?? ""),
        notifyMode: (data.notifyMode === "all" || data.notifyMode === "none"
          ? data.notifyMode
          : "alerts") as UserProfile["notifyMode"],
        notifyByEmail: data.notifyByEmail !== false,
        notifyByPush: data.notifyByPush === true,
        fcmTokens: Array.isArray(data.fcmTokens) ? (data.fcmTokens as string[]) : [],
      };
    })
    .filter((u) => u.notifyMode !== "none");
}
