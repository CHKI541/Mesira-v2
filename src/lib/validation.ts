import { z } from "zod";
import {
  CATEGORY_VALUES,
  CONDITION_VALUES,
  MAX_IMAGES_PER_PRODUCT,
  MAX_MAX_CONTACTS,
  MIN_MAX_CONTACTS,
  NEIGHBORHOOD_VALUES,
} from "@/lib/constants";

/**
 * Esquemas de validación.
 *
 * Toda ruta de /api parsea su entrada con uno de estos antes de tocar la base.
 * Nada llega a Firestore sin pasar por acá — en la versión anterior las rutas
 * leían `await request.json()` y usaban los campos directamente, así que un
 * cliente podía mandar un título de 2 MB o un `maxContacts` de 999.
 */

/**
 * Recorta espacios, colapsa los saltos de línea de más y saca caracteres de control.
 * Se conservan \n y \t porque son parte legítima de una descripción.
 */
const CONTROL_CHARS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200D\\uFEFF]",
  "g",
);

const cleanText = (value: unknown) =>
  typeof value === "string"
    ? value.replace(CONTROL_CHARS, "").replace(/\n{3,}/g, "\n\n").trim()
    : value;

const trimmed = (min: number, max: number, label: string) =>
  z.preprocess(
    cleanText,
    z
      .string()
      .min(min, `${label}: mínimo ${min} caracteres.`)
      .max(max, `${label}: máximo ${max} caracteres.`),
  );

/**
 * Teléfono argentino. Aceptamos lo que la gente realmente escribe
 * (con o sin +54, con 15, con guiones o espacios) y normalizamos a E.164.
 */
export const phoneSchema = z
  .string()
  .transform((raw) => raw.replace(/[^\d+]/g, ""))
  .refine((v) => v.replace(/\D/g, "").length >= 8, "Ingresá un celular válido.")
  .transform((v) => {
    let digits = v.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("54")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = digits.slice(1);
    // El "15" de los celulares argentinos no va en el formato internacional.
    if (digits.length > 10 && digits.includes("15")) {
      const idx = digits.indexOf("15");
      if (idx >= 2 && idx <= 4) digits = digits.slice(0, idx) + digits.slice(idx + 2);
    }
    if (!digits.startsWith("9") && digits.length === 10) digits = `9${digits}`;
    return `+54${digits}`;
  })
  .refine((v) => v.length >= 12 && v.length <= 16, "Ingresá un celular válido con característica.");

export const imageSchema = z.object({
  /** data URL con la imagen ya comprimida en el navegador. */
  dataUrl: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Formato de imagen no admitido."),
  width: z.number().int().positive().max(8000),
  height: z.number().int().positive().max(8000),
});

export const createProductSchema = z.object({
  title: trimmed(4, 80, "El título"),
  description: trimmed(10, 1500, "La descripción"),
  categories: z
    .array(z.enum(CATEGORY_VALUES as [string, ...string[]]))
    .min(1, "Elegí al menos una categoría.")
    .max(3, "Elegí hasta 3 categorías."),
  condition: z.enum(CONDITION_VALUES as [string, ...string[]]),
  neighborhood: z.enum(NEIGHBORHOOD_VALUES as [string, ...string[]]),
  customNeighborhood: z.preprocess(cleanText, z.string().max(60)).optional().nullable(),
  maxContacts: z.coerce.number().int().min(MIN_MAX_CONTACTS).max(MAX_MAX_CONTACTS),
  images: z.array(imageSchema).min(1, "Subí al menos una foto.").max(MAX_IMAGES_PER_PRODUCT),
  preferWhatsapp: z.boolean().default(true),
  shareEmail: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema
  .omit({ images: true })
  .extend({
    /** Fotos que ya estaban y se conservan, por su ruta en Storage. */
    keepImagePaths: z.array(z.string().max(300)).max(MAX_IMAGES_PER_PRODUCT),
    /** Fotos nuevas que se agregan. */
    newImages: z.array(imageSchema).max(MAX_IMAGES_PER_PRODUCT),
  })
  .refine(
    (v) => v.keepImagePaths.length + v.newImages.length >= 1,
    "La publicación tiene que quedar con al menos una foto.",
  )
  .refine(
    (v) => v.keepImagePaths.length + v.newImages.length <= MAX_IMAGES_PER_PRODUCT,
    `Máximo ${MAX_IMAGES_PER_PRODUCT} fotos.`,
  );

export const profileSchema = z.object({
  firstName: trimmed(2, 40, "El nombre"),
  lastName: trimmed(2, 40, "El apellido"),
  phone: phoneSchema,
  kehila: trimmed(2, 60, "La kehilá"),
  neighborhood: z.enum(NEIGHBORHOOD_VALUES as [string, ...string[]]).nullable().optional(),
});

export const notificationPrefsSchema = z.object({
  notifyMode: z.enum(["all", "alerts", "none"]),
  notifyByEmail: z.boolean(),
  notifyByPush: z.boolean(),
});

export const alertSchema = z.object({
  keyword: z.preprocess(cleanText, z.string().max(40)).default(""),
  categories: z.array(z.enum(CATEGORY_VALUES as [string, ...string[]])).max(13).default([]),
  neighborhoods: z.array(z.enum(NEIGHBORHOOD_VALUES as [string, ...string[]])).max(13).default([]),
  conditions: z.array(z.enum(CONDITION_VALUES as [string, ...string[]])).max(4).default([]),
  channel: z.enum(["email", "push", "both"]).default("email"),
}).refine(
  (v) =>
    v.keyword.trim().length >= 2 ||
    v.categories.length > 0 ||
    v.neighborhoods.length > 0 ||
    v.conditions.length > 0,
  "Una alerta necesita al menos una palabra clave o un filtro.",
);

export const reportSchema = z.object({
  reason: z.enum(["no-disponible", "contenido-inapropiado", "venta-encubierta", "spam", "otro"]),
  detail: z.preprocess(cleanText, z.string().max(500)).optional().nullable(),
});

export const pushTokenSchema = z.object({
  token: z.string().min(20).max(4096),
  action: z.enum(["add", "remove"]),
});

export const productStateSchema = z.object({
  action: z.enum(["close", "reopen", "deliver", "request-reactivation"]),
});

export const adminProductActionSchema = z.object({
  action: z.enum(["remove", "restore", "reopen"]),
});

export const adminUserActionSchema = z.object({
  action: z.enum(["disable", "enable"]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type AlertInput = z.infer<typeof alertSchema>;

/** Devuelve el primer mensaje legible de un ZodError, para mostrarlo tal cual. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Los datos enviados no son válidos.";
  return issue.message;
}
