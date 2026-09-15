import "server-only";

import { adminMessaging } from "@/lib/firebase/admin";
import { prunePushTokens } from "@/lib/data/users";
import { truncate } from "@/lib/format";

/**
 * Notificaciones push por Firebase Cloud Messaging.
 *
 * Además de enviar, limpia los tokens que FCM marca como muertos: cuando alguien
 * desinstala la app o borra los datos del navegador, su token queda para siempre en
 * la base y todos los envíos posteriores fallan. Sin esta limpieza la lista crece
 * indefinidamente y cada despacho se vuelve más lento.
 */

export interface PushTarget {
  uid: string;
  tokens: string[];
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  imageUrl?: string | null;
  /** Agrupa notificaciones del mismo producto para que no se apilen repetidas. */
  tag: string;
}

const DEAD_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
]);

export async function sendPush(targets: PushTarget[], payload: PushPayload): Promise<number> {
  const entries: Array<{ uid: string; token: string }> = [];
  for (const target of targets) {
    for (const token of target.tokens) {
      if (token) entries.push({ uid: target.uid, token });
    }
  }
  if (entries.length === 0) return 0;

  const notification = {
    title: truncate(payload.title, 60),
    body: truncate(payload.body, 140),
  };

  let delivered = 0;
  const dead = new Map<string, string[]>();

  // FCM acepta hasta 500 mensajes por multicast.
  for (let i = 0; i < entries.length; i += 500) {
    const chunk = entries.slice(i, i + 500);

    try {
      const response = await adminMessaging().sendEachForMulticast({
        tokens: chunk.map((e) => e.token),
        notification,
        data: { url: payload.url, tag: payload.tag },
        webpush: {
          notification: {
            ...notification,
            icon: "/icon-192.png",
            badge: "/icon-badge.png",
            tag: payload.tag,
            ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
          },
          fcmOptions: { link: payload.url },
        },
        android: {
          priority: "high",
          notification: {
            tag: payload.tag,
            icon: "ic_stat_mesira",
            color: "#17614B",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
      });

      delivered += response.successCount;

      response.responses.forEach((result, index) => {
        if (result.success) return;
        const code = (result.error as { code?: string } | undefined)?.code;
        if (code && DEAD_TOKEN_CODES.has(code)) {
          const entry = chunk[index]!;
          const list = dead.get(entry.uid) ?? [];
          list.push(entry.token);
          dead.set(entry.uid, list);
        }
      });
    } catch (error) {
      console.error("[push] falló el envío de un lote:", error);
    }
  }

  if (dead.size > 0) {
    try {
      await prunePushTokens(dead);
    } catch (error) {
      console.error("[push] no se pudieron limpiar los tokens muertos:", error);
    }
  }

  return delivered;
}
