"use client";

import { useEffect } from "react";

/**
 * Registro del service worker de la PWA.
 *
 * Es lo que permite instalar Mesira como aplicación desde el navegador. El worker de
 * notificaciones (firebase-messaging-sw.js) se registra aparte y solo cuando la
 * persona activa las push, para no pedir permisos que nadie pidió.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.error("[pwa] no se pudo registrar el service worker:", error);
      });
    };

    // Después del load, para no competir con el primer render.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
