"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from "firebase/auth";

import { getFirebaseAuth, getGoogleProvider, isFirebaseConfigured } from "@/lib/firebase/client";
import type { SessionUser } from "@/types";

/**
 * Estado de sesión del lado del cliente.
 *
 * El usuario llega ya resuelto desde el servidor (lo calcula el layout leyendo la
 * cookie), así que acá no hay `onAuthStateChanged` ni carga inicial en blanco.
 * Eso elimina de raíz el parpadeo de "no estás logueado" que tenía la versión
 * anterior en cada navegación, y los bucles de render de su AuthContext.
 *
 * Este proveedor solo se ocupa de las dos transiciones: entrar y salir.
 */

interface AuthValue {
  user: SessionUser | null;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOutNow: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Errores de Firebase traducidos a algo que una persona pueda accionar. */
function readableError(code: string): string {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Permitila y probá de nuevo.";
    case "auth/network-request-failed":
      return "No hay conexión. Revisá tu internet y volvé a intentar.";
    case "auth/user-disabled":
      return "Tu cuenta está deshabilitada. Escribinos a soporte si creés que es un error.";
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase. Avisanos por soporte.";
    default:
      return "No pudimos iniciar sesión. Probá de nuevo en un momento.";
  }
}

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Cambia el ID token por la cookie de sesión del servidor. */
  const exchangeForSession = useCallback(
    async (credential: UserCredential) => {
      const idToken = await credential.user.getIdToken(true);

      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        await signOut(getFirebaseAuth()).catch(() => undefined);
        throw new Error(payload.error ?? "No pudimos abrir tu sesión.");
      }

      // El servidor vuelve a calcular quién sos; refrescar la ruta trae ese estado.
      router.refresh();
    },
    [router],
  );

  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setError("La aplicación no está configurada todavía. Avisanos por soporte.");
      return;
    }

    setSigningIn(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();

      // Dentro de la app Android (WebView) Google rechaza el popup con
      // `disallowed_useragent`, así que ahí se usa redirect.
      const isWebView =
        typeof navigator !== "undefined" &&
        /\bwv\b|Android.*Version\/[\d.]+.*Chrome|MesiraApp/i.test(navigator.userAgent) &&
        !/Chrome\/\d+\.\d+\.\d+\.\d+ Mobile Safari/i.test(navigator.userAgent);

      if (isWebView) {
        await signInWithRedirect(auth, getGoogleProvider());
        return;
      }

      const credential = await signInWithPopup(auth, getGoogleProvider());
      await exchangeForSession(credential);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const message = code ? readableError(code) : (err as Error).message;
      if (message) setError(message);
    } finally {
      setSigningIn(false);
    }
  }, [exchangeForSession]);

  /** Completa el flujo de redirect al volver de Google (solo en la app Android). */
  const resumeRedirect = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    try {
      const credential = await getRedirectResult(getFirebaseAuth());
      if (credential) await exchangeForSession(credential);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const message = readableError(code);
      if (message) setError(message);
    }
  }, [exchangeForSession]);

  const signOutNow = useCallback(async () => {
    try {
      await fetch("/api/session", { method: "DELETE" });
      if (isFirebaseConfigured) {
        await signOut(getFirebaseAuth()).catch(() => undefined);
      }
    } finally {
      setUser(null);
      router.refresh();
      router.push("/");
    }
  }, [router]);

  const value = useMemo<AuthValue>(
    () => ({ user: initialUser ?? user, signingIn, error, signIn, signOutNow }),
    [initialUser, user, signingIn, error, signIn, signOutNow],
  );

  return (
    <AuthContext.Provider value={value}>
      <RedirectResume run={resumeRedirect} />
      {children}
    </AuthContext.Provider>
  );
}

/** Corre una sola vez al montar, para retomar un login por redirect. */
function RedirectResume({ run }: { run: () => Promise<void> }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  return null;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth tiene que usarse dentro de AuthProvider.");
  return context;
}
