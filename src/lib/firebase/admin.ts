import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

/**
 * Firebase Admin. Solo servidor.
 *
 * El import de "server-only" hace que el build falle si alguien importa este
 * archivo desde un componente cliente por accidente — que es exactamente cómo
 * se filtra una clave de servicio al bundle del navegador.
 *
 * La credencial se lee de FIREBASE_SERVICE_ACCOUNT_KEY, un único JSON. La versión
 * anterior aceptaba la clave privada partida en varias variables y tenía veinte
 * líneas para desarmar comillas y saltos de línea escapados; eso era una fuente
 * de fallos silenciosos en cada deploy.
 */

interface ServiceAccountShape {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedApp: App | null = null;

function parseServiceAccount(): ServiceAccountShape {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw && raw.trim() !== "") {
    try {
      const parsed = JSON.parse(raw) as Partial<ServiceAccountShape>;
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          project_id: parsed.project_id,
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      // Si el JSON falla o viene con escape incorrecto de Vercel, probar fallback abajo
    }
  }

  // Fallback con variables individuales existentes en Vercel
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "mesira-argentina";

  if (clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  throw new Error(
    "Falta FIREBASE_SERVICE_ACCOUNT_KEY o credenciales de Firebase válidas en las variables de entorno.",
  );
}

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  const account = parseServiceAccount();
  cachedApp = initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${account.project_id}.firebasestorage.app`,
  });

  return cachedApp;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

let firestoreConfigured = false;
export function adminDb(): Firestore {
  const db = getFirestore(getAdminApp());
  if (!firestoreConfigured) {
    // Un `undefined` en un objeto que se escribe tira error por defecto. Ignorarlo
    // hace que los campos opcionales se puedan omitir sin armar el objeto a mano.
    db.settings({ ignoreUndefinedProperties: true });
    firestoreConfigured = true;
  }
  return db;
}

export function adminMessaging(): Messaging {
  return getMessaging(getAdminApp());
}

export function adminBucket() {
  return getStorage(getAdminApp()).bucket();
}

/** Nombres de las colecciones, en un solo lugar para no escribirlos sueltos. */
export const COLLECTIONS = {
  users: "users",
  products: "products",
  alerts: "alerts",
  reports: "reports",
  rateLimits: "rateLimits",
} as const;
