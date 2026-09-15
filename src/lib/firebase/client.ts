"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  type Auth,
} from "firebase/auth";

/**
 * SDK de Firebase del lado del navegador.
 *
 * Acá vive únicamente la autenticación y (en otro archivo) los tokens de push.
 * El cliente NO abre Firestore ni Storage: todos los datos llegan por componentes
 * de servidor o por /api. Ver SEGURIDAD.md.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase no está configurado. Faltan variables NEXT_PUBLIC_FIREBASE_* en el entorno.",
    );
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(config as Required<typeof config>);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    // La sesión real la lleva la cookie httpOnly del servidor; esto solo mantiene
    // el usuario de Firebase vivo entre recargas para poder renovar el token.
    void setPersistence(authInstance, browserLocalPersistence);
  }
  return authInstance;
}

export function getGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
