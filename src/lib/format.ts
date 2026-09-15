/**
 * Utilidades de formato compartidas entre servidor y cliente.
 * No importa nada de Firebase para poder usarse en cualquier lado.
 */

/**
 * Convierte a milisegundos cualquier cosa que Firestore pueda devolver como fecha:
 * un Timestamp, un Date, un número o un string ISO.
 *
 * Existe porque la base heredada tiene las cuatro formas conviviendo. En los
 * documentos nuevos siempre se escribe un Timestamp, así que con el tiempo esto
 * se vuelve un simple `.toMillis()`.
 */
export function toMillis(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();

  if (typeof value === "object") {
    const candidate = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof candidate.toDate === "function") return candidate.toDate().getTime();
    if (typeof candidate.seconds === "number") return candidate.seconds * 1000;
    if (typeof candidate._seconds === "number") return candidate._seconds * 1000;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "Hoy", "Ayer" o "12 de marzo". Es la etiqueta de los filetes de día del tablero. */
export function dayLabel(ms: number, now: number = Date.now()): string {
  const date = new Date(ms);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Hoy";
  if (sameDay(date, yesterday)) return "Ayer";

  const month = MONTHS[date.getMonth()] ?? "";
  const withYear = date.getFullYear() !== today.getFullYear() ? ` de ${date.getFullYear()}` : "";
  return `${date.getDate()} de ${month}${withYear}`;
}

/** "hace 5 minutos", "hace 3 horas", "hace 2 días". */
export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  const months = Math.floor(days / 30);
  return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

/** "12 de marzo de 2026, 14:30" */
export function fullDate(ms: number): string {
  const d = new Date(ms);
  const month = MONTHS[d.getMonth()] ?? "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} de ${month} de ${d.getFullYear()}, ${hh}:${mm}`;
}

/** Cuántas horas faltan para un momento futuro, redondeado hacia arriba. */
export function hoursUntil(ms: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((ms - now) / 3_600_000));
}

/** "+54 9 11 2345-6789" a partir de un E.164. Si no reconoce el formato, lo deja como está. */
export function displayPhone(e164: string): string {
  const m = /^\+54(9?)(\d{2,4})(\d{4})(\d{4})$/.exec(e164);
  if (!m) return e164;
  const [, nine, area, a, b] = m;
  return `+54 ${nine ? "9 " : ""}${area} ${a}-${b}`;
}

/** Enlace de WhatsApp con un mensaje ya escrito. */
export function whatsappLink(e164: string, message: string): string {
  const digits = e164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Recorta un texto sin cortar una palabra al medio. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Normaliza para buscar: minúsculas y sin tildes, así "bebes" encuentra "bebés". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Escapa HTML. Se usa al armar los correos, que se construyen con strings. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Une clases condicionales sin arrastrar una dependencia para eso. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
