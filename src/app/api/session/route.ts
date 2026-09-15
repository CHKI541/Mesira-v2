import { cookies } from "next/headers";
import { z } from "zod";

import { fail, handle, ok, readJson } from "@/lib/api";
import { adminAuth } from "@/lib/firebase/admin";
import {
  ApiError,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  createSessionCookie,
  getSessionToken,
} from "@/lib/auth/session";
import { ensureProfile, getProfile } from "@/lib/data/users";
import { consumeRate, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ idToken: z.string().min(20).max(4096) });

/**
 * Intercambia el ID token de Firebase por una cookie de sesión httpOnly.
 *
 * Esta es la única vez que un token de Firebase viaja del navegador al servidor.
 * De ahí en adelante la sesión es la cookie, que ningún script puede leer.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    await consumeRate("session", requestIp(request));

    const { idToken } = bodySchema.parse(await readJson(request, 64 * 1024));

    let decoded;
    try {
      // checkRevoked en true: un token de una cuenta ya deshabilitada no sirve.
      decoded = await adminAuth().verifyIdToken(idToken, true);
    } catch {
      throw new ApiError(401, "No pudimos validar tu inicio de sesión. Probá de nuevo.");
    }

    // Firebase solo acepta convertir en cookie un token emitido hace menos de 5 minutos.
    const authAgeSeconds = Date.now() / 1000 - (decoded.auth_time ?? 0);
    if (authAgeSeconds > 5 * 60) {
      throw new ApiError(401, "Tu inicio de sesión expiró. Volvé a entrar con Google.");
    }

    const userRecord = await adminAuth().getUser(decoded.uid);
    if (userRecord.disabled) {
      throw new ApiError(403, "Tu cuenta está deshabilitada. Escribinos a soporte si creés que es un error.");
    }

    const email = decoded.email ?? userRecord.email ?? "";
    await ensureProfile(decoded.uid, email, decoded.name ?? userRecord.displayName ?? null);

    const profile = await getProfile(decoded.uid);
    if (profile?.disabled) {
      throw new ApiError(403, "Tu cuenta está deshabilitada. Escribinos a soporte si creés que es un error.");
    }

    const sessionCookie = await createSessionCookie(idToken);
    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    const complete = Boolean(
      profile?.firstName.trim() &&
        profile?.lastName.trim() &&
        profile?.phone.trim() &&
        profile?.kehila.trim(),
    );

    return ok({ uid: decoded.uid, profileComplete: complete });
  });
}

/** Cierra la sesión y revoca los refresh tokens, así no se puede reusar en otro lado. */
export async function DELETE(): Promise<Response> {
  return handle(async () => {
    const token = await getSessionToken();
    const store = await cookies();
    store.delete(SESSION_COOKIE);

    if (token) {
      try {
        await adminAuth().revokeRefreshTokens(token.uid);
      } catch (error) {
        console.error("[session] no se pudieron revocar los tokens:", error);
      }
    }

    return ok({ signedOut: true });
  });
}

export async function GET(): Promise<Response> {
  return fail(405, "Método no permitido.");
}
