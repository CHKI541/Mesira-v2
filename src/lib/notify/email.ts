import "server-only";

import { escapeHtml } from "@/lib/format";

/**
 * Envío de correo vía la API HTTP de Resend.
 *
 * Se usa HTTP y no SMTP a propósito: en un entorno serverless una conexión SMTP
 * tarda en negociarse, se queda colgada cuando el proveedor limita, y era una de las
 * causas de que el despachador de alertas fallara en producción. Un POST a Resend
 * tiene timeout propio y responde con un código claro.
 *
 * También evita la dependencia de nodemailer entera para mandar tres correos.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const BATCH_ENDPOINT = "https://api.resend.com/emails/batch";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Mesira <alertas@mesira.net>";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function post(url: string, body: unknown): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY no está configurada; no se envió nada.");
    return false;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[email] Resend respondió ${response.status}: ${detail.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] no se pudo contactar a Resend:", error);
    return false;
  }
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  return post(RESEND_ENDPOINT, {
    from: fromAddress(),
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text,
    reply_to: process.env.EMAIL_REPLY_TO,
  });
}

/** Resend admite hasta 100 mensajes por lote. */
export async function sendEmailBatch(messages: EmailMessage[]): Promise<number> {
  if (messages.length === 0) return 0;

  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const payload = chunk.map((m) => ({
      from: fromAddress(),
      to: [m.to],
      subject: m.subject,
      html: m.html,
      text: m.text,
      reply_to: process.env.EMAIL_REPLY_TO,
    }));
    if (await post(BATCH_ENDPOINT, payload)) sent += chunk.length;
  }
  return sent;
}

// --- Plantillas -------------------------------------------------------------

/**
 * Los correos se arman con strings, así que todo lo que venga de un usuario pasa
 * por escapeHtml. Un título de publicación con `<script>` no puede terminar
 * ejecutándose en el cliente de correo de otra persona.
 */

interface NewProductEmailData {
  recipientName: string;
  productTitle: string;
  productDescription: string;
  productUrl: string;
  neighborhood: string;
  imageUrl: string | null;
  reason: "alert" | "all";
  keyword?: string;
}

export function newProductEmail(data: NewProductEmailData): { subject: string; html: string; text: string } {
  const title = escapeHtml(data.productTitle);
  const description = escapeHtml(
    data.productDescription.length > 220
      ? `${data.productDescription.slice(0, 220)}…`
      : data.productDescription,
  );
  const neighborhood = escapeHtml(data.neighborhood);
  const name = escapeHtml(data.recipientName || "Hola");
  const url = data.productUrl;

  const reasonLine =
    data.reason === "alert" && data.keyword
      ? `Te llega porque tenés una alerta para “${escapeHtml(data.keyword)}”.`
      : data.reason === "alert"
        ? "Te llega porque coincide con una de tus alertas."
        : "Te llega porque elegiste recibir aviso de cada publicación nueva.";

  const subject = `Nueva mitzvá: ${data.productTitle}`;

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#F2F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14262E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #D8DCD6;border-radius:4px;">
    <tr><td style="padding:20px 24px;border-bottom:1px solid #D8DCD6;">
      <span style="font-size:16px;font-weight:700;letter-spacing:-0.01em;">Mesira</span>
      <span style="font-size:13px;color:#5C6E77;margin-left:8px;">Publicación nueva</span>
    </td></tr>
    ${
      data.imageUrl
        ? `<tr><td style="padding:0;"><img src="${data.imageUrl}" alt="${title}" width="520" style="width:100%;max-width:520px;height:auto;display:block;border:0;"></td></tr>`
        : ""
    }
    <tr><td style="padding:24px;">
      <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;font-weight:700;letter-spacing:-0.012em;">${title}</h1>
      <p style="margin:0 0 4px;font-size:13px;color:#5C6E77;">${neighborhood}</p>
      <p style="margin:16px 0 24px;font-size:15px;line-height:1.6;color:#14262E;">${description}</p>
      <a href="${url}" style="display:inline-block;background:#17614B;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:4px;">Ver la publicación</a>
    </td></tr>
    <tr><td style="padding:16px 24px;border-top:1px solid #D8DCD6;font-size:12px;line-height:1.6;color:#5C6E77;">
      <p style="margin:0 0 6px;">${name}, ${reasonLine}</p>
      <p style="margin:0;">Podés cambiar tus avisos en <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://mesira.net"}/mi-cuenta?seccion=alertas" style="color:#14262E;">Mi cuenta</a>.</p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `${data.productTitle}`,
    `${data.neighborhood}`,
    "",
    data.productDescription.slice(0, 300),
    "",
    `Ver la publicación: ${url}`,
    "",
    reasonLine.replace(/<[^>]*>/g, ""),
    `Cambiar tus avisos: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://mesira.net"}/mi-cuenta?seccion=alertas`,
  ].join("\n");

  return { subject, html, text };
}

interface ContactEmailData {
  ownerName: string;
  interestedName: string;
  interestedPhone: string;
  interestedEmail: string;
  productTitle: string;
  productUrl: string;
  contactCount: number;
  maxContacts: number;
}

/** Aviso al donante de que alguien pidió su contacto. */
export function contactNoticeEmail(data: ContactEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const title = escapeHtml(data.productTitle);
  const who = escapeHtml(data.interestedName);
  const phone = escapeHtml(data.interestedPhone);
  const email = escapeHtml(data.interestedEmail);
  const remaining = Math.max(0, data.maxContacts - data.contactCount);

  const subject = `Alguien quiere tu ${data.productTitle}`;

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#F2F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14262E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #D8DCD6;border-radius:4px;">
    <tr><td style="padding:24px;">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:700;">Alguien pidió tu contacto</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${who} está interesado en <strong>${title}</strong> y ya tiene tu número. Si preferís escribirle vos primero:</p>
      <p style="margin:0 0 4px;font-size:15px;">Celular: <strong>${phone}</strong></p>
      <p style="margin:0 0 20px;font-size:15px;">Email: <strong>${email}</strong></p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#5C6E77;">${
        remaining > 0
          ? `Tu publicación sigue abierta. Le quedan ${remaining} ${remaining === 1 ? "contacto" : "contactos"} antes de cerrarse sola.`
          : "Tu publicación llegó al límite de contactos y se cerró. Cuando entregues el artículo, marcalo como entregado desde Mi cuenta."
      }</p>
      <a href="${data.productUrl}" style="display:inline-block;background:#17614B;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:4px;">Ver mi publicación</a>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `${data.interestedName} está interesado en "${data.productTitle}".`,
    "",
    `Celular: ${data.interestedPhone}`,
    `Email: ${data.interestedEmail}`,
    "",
    `Ver la publicación: ${data.productUrl}`,
  ].join("\n");

  return { subject, html, text };
}
