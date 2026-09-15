/**
 * Vocabulario del dominio.
 *
 * Todo lo que el usuario ve escrito en un filtro, un chip o un correo sale de acá.
 * Los `value` se guardan en Firestore y no deben cambiar sin una migración;
 * los `label` son texto de interfaz y se pueden retocar libremente.
 */

export const CATEGORIES = [
  { value: "muebles", label: "Muebles" },
  { value: "ropa", label: "Ropa" },
  { value: "bebes", label: "Bebés y niños" },
  { value: "electronica", label: "Electrónica" },
  { value: "electrodomesticos", label: "Electrodomésticos" },
  { value: "bazar", label: "Bazar y cocina" },
  { value: "libros", label: "Libros" },
  { value: "judaica", label: "Kodesh y judaica" },
  { value: "juguetes", label: "Juguetes" },
  { value: "herramientas", label: "Herramientas" },
  { value: "salud", label: "Salud y farmacia" },
  { value: "vehiculos", label: "Accesorios de vehículos" },
  { value: "otro", label: "Otro" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];
export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as CategoryValue[];

export const CONDITIONS = [
  { value: "perfecto", label: "Como nuevo", hint: "Sin uso o prácticamente sin uso" },
  { value: "bueno", label: "Buen estado", hint: "Usado, cuidado, sin fallas" },
  { value: "funcional", label: "Funcional", hint: "Anda bien, tiene marcas de uso" },
  { value: "reparar", label: "Para reparar", hint: "Necesita arreglo o sirve de repuesto" },
] as const;

export type ConditionValue = (typeof CONDITIONS)[number]["value"];
export const CONDITION_VALUES = CONDITIONS.map((c) => c.value) as ConditionValue[];

/**
 * Barrios de CABA y Gran Buenos Aires con presencia de la comunidad.
 * "otro" habilita un campo de texto libre.
 */
export const NEIGHBORHOODS = [
  { value: "once", label: "Once / Balvanera" },
  { value: "flores", label: "Flores" },
  { value: "belgrano", label: "Belgrano" },
  { value: "palermo", label: "Palermo" },
  { value: "villa-crespo", label: "Villa Crespo" },
  { value: "almagro", label: "Almagro" },
  { value: "caballito", label: "Caballito" },
  { value: "barracas", label: "Barracas" },
  { value: "recoleta", label: "Recoleta" },
  { value: "nunez", label: "Núñez" },
  { value: "vicente-lopez", label: "Vicente López" },
  { value: "san-isidro", label: "San Isidro" },
  { value: "otro", label: "Otro barrio" },
] as const;

export type NeighborhoodValue = (typeof NEIGHBORHOODS)[number]["value"];
export const NEIGHBORHOOD_VALUES = NEIGHBORHOODS.map((n) => n.value) as NeighborhoodValue[];

/**
 * Kehilot. Es un campo abierto en el perfil (hay muchas y aparecen nuevas),
 * pero estas se ofrecen como sugerencia para que la mayoría quede normalizada.
 */
export const KEHILOT = [
  "Jabad Lubavitch",
  "Sucat David",
  "Shaare Sion",
  "Ajdut Israel",
  "Agudat Dodim",
  "Yesod Hadat",
  "Or Torá",
  "Comunidad Amijai",
  "Bet El",
  "NCI Emanu El",
  "Otra",
] as const;

/** Estados de una publicación. Es un único campo, no tres booleanos cruzados. */
export const PRODUCT_STATUS = {
  /** Visible en el tablero, se puede contactar. */
  available: "available",
  /** Cerrada: llegó al límite de contactos o el dueño la pausó. Sigue visible 48h. */
  closed: "closed",
  /** El dueño confirmó que la entregó. */
  delivered: "delivered",
  /** La moderación la bajó. No se muestra a nadie salvo al admin. */
  removed: "removed",
} as const;

export type ProductStatus = keyof typeof PRODUCT_STATUS;

export const STATUS_LABEL: Record<ProductStatus, string> = {
  available: "Disponible",
  closed: "Cerrada",
  delivered: "Entregada",
  removed: "Dada de baja",
};

// --- Reglas de negocio ------------------------------------------------------

/** Cuántas personas distintas pueden pedir el contacto antes de que se cierre sola. */
export const DEFAULT_MAX_CONTACTS = 3;
export const MIN_MAX_CONTACTS = 1;
export const MAX_MAX_CONTACTS = 10;

/** Cuánto sigue visible una publicación cerrada antes de desaparecer del tablero. */
export const CLOSED_VISIBLE_HOURS = 48;

/** Vida máxima de una publicación activa en el tablero. */
export const ACTIVE_LIFESPAN_DAYS = 60;

/** Cuántas fotos admite una publicación. */
export const MAX_IMAGES_PER_PRODUCT = 4;

/** Tamaño máximo por foto ya comprimida, en bytes. */
export const MAX_IMAGE_BYTES = 600 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Cuántas publicaciones puede crear una persona por día. */
export const MAX_PRODUCTS_PER_DAY = 10;

/** Cuántas alertas de palabra clave puede tener una persona. */
export const MAX_ALERTS_PER_USER = 15;

/** Cuántos artículos trae el tablero de una sola vez. */
export const FEED_PAGE_SIZE = 48;

// --- Helpers de etiqueta ----------------------------------------------------

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function conditionLabel(value: string): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function neighborhoodLabel(value: string, custom?: string | null): string {
  if (value === "otro") return custom?.trim() || "Otro barrio";
  return NEIGHBORHOODS.find((n) => n.value === value)?.label ?? value;
}
