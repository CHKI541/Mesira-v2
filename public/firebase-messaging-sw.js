/* eslint-disable */
/**
 * Service worker de notificaciones push.
 *
 * Separado del service worker de la PWA a propósito: este solo se registra cuando la
 * persona activa las notificaciones, así nadie recibe un pedido de permiso que no pidió.
 *
 * La configuración de Firebase va escrita acá porque un service worker no puede leer
 * las variables de entorno del bundle. Son las mismas claves públicas que ya viajan al
 * navegador; lo que protege la base son las reglas y el servidor, no estas claves.
 *
 * IMPORTANTE: si cambiás de proyecto de Firebase, hay que actualizar estos valores a mano.
 */

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REEMPLAZAR_API_KEY",
  authDomain: "REEMPLAZAR_AUTH_DOMAIN",
  projectId: "REEMPLAZAR_PROJECT_ID",
  storageBucket: "REEMPLAZAR_STORAGE_BUCKET",
  messagingSenderId: "REEMPLAZAR_SENDER_ID",
  appId: "REEMPLAZAR_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Mesira";
  const options = {
    body: payload.notification?.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-badge.png",
    // El tag agrupa avisos del mismo producto para que no se apilen repetidos.
    tag: payload.data?.tag ?? "mesira",
    data: { url: payload.data?.url ?? "/" },
    renotify: false,
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Si Mesira ya está abierta, se navega en esa pestaña en lugar de abrir otra.
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
