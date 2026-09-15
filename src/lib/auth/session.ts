import "server-only";

import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth, adminDb, COLLECTIONS } from "@/lib/firebase/admin";
import type { SessionUser, UserProfile } from "@/types";
import { toMillis } from "@/lib/format";

/**
 * Sesión del servidor.
 *
 * La app usa cookies de sesión de Firebase en lugar de mandar el ID token en cada
 * request. Ventajas concretas sobre la versión anterior:
 *
 *  - La cookie es httpOnly: ningún script de la página puede leerla, así que un XSS
 *    no se lleva la sesión.
 *  - Los componentes de servidor pueden saber quién sos y renderizar directamente.
 *  - `verifySessionCookie(..., true)` chequea revocación, así que deshabilitar una
 *    cuenta la expulsa de verdad, en lugar de esperar a que expire su token.
 */

export const SESSION_COOKIE = "mesira_session";

/** 5 días. Es el máximo que admite Firebase para cookies de sesión (14 días), acortado a propósito. */
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Un usuario es administrador si tiene el custom claim `admin`, o si su email está
 * en ADMIN_EMAILS. El claim es el mecanismo real; la variable de entorno existe solo
 * para poder darle el claim al primer admin (`npm run admin:set`) y como red de
 * seguridad si alguien pierde el acceso.
 *
 * Lo importante es que la lista ya no está escrita dentro del código fuente, que es
 * donde estaba antes — repetida en nueve lugares, incluido el bundle del navegador.
 */
export function isAdminToken(token: Pick<DecodedIdToken, "email"> & { admin?: unknown }): boolean {
  if (token.admin === true) return true;
  const email = token.email?.toLowerCase();
  return Boolean(email && adminEmails().includes(email));
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

/** Lee y verifica la cookie. Devuelve null si no hay sesión válida — no tira error. */
export async function getSessionToken(): Promise<DecodedIdToken | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) return null;

  try {
    // El `true` fuerza el chequeo de revocación contra el servidor de Firebase.
    return await adminAuth().verifySessionCookie(value, true);
  } catch {
    return null;
  }
}

function profileFromDoc(uid: string, data: FirebaseFirestore.DocumentData): UserProfile {
  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    firstName: typeof data.firstName === "string" ? data.firstName : "",
    lastName: typeof data.lastName === "string" ? data.lastName : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    kehila: typeof data.kehila === "string" ? data.kehila : "",
    neighborhood: data.neighborhood ?? null,
    notifyMode: data.notifyMode === "all" || data.notifyMode === "none" ? data.notifyMode : "alerts",
    notifyByEmail: data.notifyByEmail !== false,
    notifyByPush: data.notifyByPush === true,
    disabled: data.disabled === true,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.firstName.trim() && profile.lastName.trim() && profile.phone.trim() && profile.kehila.trim(),
  );
}

/**
 * Usuario de la sesión actual, con su perfil. Null si no hay sesión.
 * Una cuenta deshabilitada se trata como si no tuviera sesión.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const snap = await adminDb().collection(COLLECTIONS.users).doc(token.uid).get();
  const profile = snap.exists ? profileFromDoc(token.uid, snap.data()!) : null;

  if (profile?.disabled) return null;

  return {
    uid: token.uid,
    email: token.email ?? profile?.email ?? "",
    displayName: (token.name as string | undefined) ?? null,
    photoURL: (token.picture as string | undefined) ?? null,
    isAdmin: isAdminToken(token),
    profileComplete: isProfileComplete(profile),
    profile,
  };
}

/** Exige sesión. Tira 401 si no hay. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Iniciá sesión para hacer esto.");
  return user;
}

/** Exige sesión con el perfil completo. Tira 403 si falta completarlo. */
export async function requireCompleteUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.profileComplete) {
    throw new ApiError(403, "Completá tu perfil (nombre, apellido, celular y kehilá) para continuar.");
  }
  return user;
}

/** Exige sesión de administrador. Tira 403 si no lo es. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new ApiError(403, "No tenés permiso para hacer esto.");
  return user;
}
