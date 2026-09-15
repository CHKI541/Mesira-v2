import "server-only";

import { findMatchingAlerts } from "@/lib/data/alerts";
import { getNotifiableUsers } from "@/lib/data/users";
import { neighborhoodLabel } from "@/lib/constants";
import { newProductEmail, sendEmailBatch } from "@/lib/notify/email";
import { sendPush, type PushTarget } from "@/lib/notify/push";
import { truncate } from "@/lib/format";
import type { Product } from "@/types";

/**
 * Despacha los avisos de una publicación nueva.
 *
 * Esto antes vivía en una ruta pública `/api/alerts/notify` que el navegador llamaba
 * después de publicar, protegida con un "secreto" que estaba en una variable
 * NEXT_PUBLIC_*, es decir, dentro del bundle y visible para cualquiera. Con ese
 * secreto se podía disparar un envío masivo de correos y push a toda la base.
 *
 * Ahora es una función interna: la llama el servidor justo después de crear la
 * publicación, y no hay ninguna ruta HTTP que la exponga.
 */

const MAX_RECIPIENTS = 2000;

export interface DispatchResult {
  emails: number;
  pushes: number;
}

export async function dispatchNewProductNotifications(product: Product): Promise<DispatchResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mesira.net";
  const productUrl = `${siteUrl}/producto/${product.id}`;
  const neighborhood = neighborhoodLabel(product.neighborhood, product.customNeighborhood);
  const image = product.images[0]?.url ?? null;

  const [users, alerts] = await Promise.all([getNotifiableUsers(), findMatchingAlerts(product)]);

  /** uid -> por qué se le avisa. Una alerta gana sobre "todo", para explicar mejor el correo. */
  const reasons = new Map<string, { reason: "alert" | "all"; keyword?: string; channel: string }>();

  for (const user of users) {
    if (user.uid === product.ownerId) continue;
    if (user.notifyMode === "all") {
      reasons.set(user.uid, { reason: "all", channel: "both" });
    }
  }

  for (const alert of alerts) {
    reasons.set(alert.userId, {
      reason: "alert",
      keyword: alert.keyword.trim() || undefined,
      channel: alert.channel,
    });
  }

  if (reasons.size === 0) return { emails: 0, pushes: 0 };

  const byUid = new Map(users.map((u) => [u.uid, u]));

  const emails: Array<{ to: string; subject: string; html: string; text: string }> = [];
  const pushTargets: PushTarget[] = [];

  let count = 0;
  for (const [uid, info] of reasons) {
    if (count >= MAX_RECIPIENTS) break;
    const user = byUid.get(uid);
    if (!user) continue;

    const wantsEmail = user.notifyByEmail && (info.channel === "email" || info.channel === "both");
    const wantsPush =
      user.notifyByPush && user.fcmTokens.length > 0 && (info.channel === "push" || info.channel === "both");

    if (wantsEmail && user.email) {
      const built = newProductEmail({
        recipientName: user.firstName,
        productTitle: product.title,
        productDescription: product.description,
        productUrl,
        neighborhood,
        imageUrl: image,
        reason: info.reason,
        keyword: info.keyword,
      });
      emails.push({ to: user.email, ...built });
    }

    if (wantsPush) {
      pushTargets.push({ uid: user.uid, tokens: user.fcmTokens });
    }

    count += 1;
  }

  // Los dos canales en paralelo. Si uno falla, el otro igual sale.
  const [emailsSent, pushesSent] = await Promise.all([
    emails.length > 0 ? sendEmailBatch(emails).catch(() => 0) : Promise.resolve(0),
    pushTargets.length > 0
      ? sendPush(pushTargets, {
          title: truncate(product.title, 60),
          body: `En ${neighborhood}. ${truncate(product.description, 90)}`,
          url: productUrl,
          imageUrl: image,
          tag: `producto-${product.id}`,
        }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  return { emails: emailsSent, pushes: pushesSent };
}
