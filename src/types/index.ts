import type {
  CategoryValue,
  ConditionValue,
  NeighborhoodValue,
  ProductStatus,
} from "@/lib/constants";

/**
 * Formas de los datos tal como viajan entre el servidor y el cliente.
 *
 * Regla importante: todo lo que se serializa a un componente cliente usa
 * `number` (milisegundos) para las fechas, nunca `Timestamp` de Firestore.
 * Los Timestamp no se pueden serializar y eran una fuente constante de errores
 * en la versión anterior, que tenía un helper para desenredar cuatro formatos
 * de fecha distintos conviviendo en la misma base.
 */

export interface ProductImage {
  url: string;
  /** Ruta dentro de Storage, para poder borrar el archivo después. */
  path: string;
  width: number;
  height: number;
}

/** Lo que ve cualquier persona, con o sin sesión. Sin datos de contacto. */
export interface Product {
  id: string;
  title: string;
  description: string;
  categories: CategoryValue[];
  condition: ConditionValue;
  neighborhood: NeighborhoodValue;
  customNeighborhood: string | null;
  images: ProductImage[];
  status: ProductStatus;

  ownerId: string;
  ownerName: string;
  ownerKehila: string | null;

  createdAt: number;
  updatedAt: number;
  closedAt: number | null;

  maxContacts: number;
  contactCount: number;
  viewCount: number;

  /** Solo se completa cuando quien mira es el dueño o un administrador. */
  contactedUserIds?: string[];
  reactivationRequested?: boolean;
}

/** Datos de contacto. Viven en products/{id}/private/contact y solo los lee el servidor. */
export interface ProductContact {
  phone: string;
  email: string | null;
  /** Cómo prefiere que lo contacten. */
  preferWhatsapp: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  kehila: string;
  neighborhood: NeighborhoodValue | null;
  /** Recibir aviso de cada publicación nueva, solo de las alertas, o nada. */
  notifyMode: "all" | "alerts" | "none";
  notifyByEmail: boolean;
  notifyByPush: boolean;
  disabled: boolean;
  createdAt: number;
  updatedAt: number;
  /** Solo lo devuelve el panel de administración. */
  productCount?: number;
}

/** Lo que el cliente sabe de la sesión. Nunca incluye tokens ni la cookie. */
export interface SessionUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
  /** Un perfil está completo cuando tiene nombre, apellido, teléfono y kehilá. */
  profileComplete: boolean;
  profile: UserProfile | null;
}

export interface Alert {
  id: string;
  userId: string;
  keyword: string;
  categories: CategoryValue[];
  neighborhoods: NeighborhoodValue[];
  conditions: ConditionValue[];
  channel: "email" | "push" | "both";
  createdAt: number;
}

export interface Report {
  id: string;
  productId: string;
  productTitle: string;
  reporterId: string;
  reporterEmail: string;
  reason: string;
  detail: string | null;
  resolved: boolean;
  createdAt: number;
}

export interface FeedFilters {
  q: string;
  categories: CategoryValue[];
  neighborhoods: NeighborhoodValue[];
  conditions: ConditionValue[];
}

/** Forma estándar de respuesta de todas las rutas de /api. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
