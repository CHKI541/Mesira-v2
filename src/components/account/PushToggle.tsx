"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { getFirebaseApp } from "@/lib/firebase/client";

/**
 * Notificaciones push en este dispositivo.
 *
 * Firebase Messaging se importa de forma dinámica y solo cuando la persona activa el
 * interruptor. Cargarlo siempre suma un bundle grande a cada visita, y en los
 * navegadores sin soporte (Safari viejo, modo privado de algunos) tira errores en la
 * consola apenas carga la página.
 */
export function PushToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const toast = useToast();

  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function change(next: boolean) {
    setBusy(true);
    setNote(null);

    try {
      if (!next) {
        setOn(false);
        await fetch("/api/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifyMode: "alerts", notifyByEmail: true, notifyByPush: false }),
        });
        router.refresh();
        return;
      }

      if (typeof window === "undefined" || !("Notification" in window)) {
        setNote("Este navegador no admite notificaciones push. Probá desde la app o desde Chrome.");
        return;
      }
      if (!("serviceWorker" in navigator)) {
        setNote("Este navegador no admite notificaciones push.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNote(
          "El navegador bloqueó las notificaciones. Habilitalas desde el candado de la barra de direcciones.",
        );
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        setNote("Las notificaciones push no están configuradas todavía.");
        return;
      }

      const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
      if (!(await isSupported())) {
        setNote("Este navegador no admite notificaciones push.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });

      const token = await getToken(getMessaging(getFirebaseApp()), {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        setNote("No pudimos registrar este dispositivo. Probá de nuevo.");
        return;
      }

      const response = await fetch("/api/me/push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "add" }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setNote(payload.error ?? "No pudimos activar las notificaciones.");
        return;
      }

      setOn(true);
      toast("Notificaciones activadas en este dispositivo.");
      router.refresh();
    } catch (error) {
      console.error("[push] no se pudo cambiar el estado:", error);
      setNote("No pudimos activar las notificaciones en este dispositivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Toggle
        checked={on}
        disabled={busy}
        onChange={(next) => void change(next)}
        label="En este dispositivo"
        description="Un aviso en la pantalla, como los de WhatsApp."
      />
      {note ? <p className="pb-3 text-small text-amber">{note}</p> : null}
    </div>
  );
}
