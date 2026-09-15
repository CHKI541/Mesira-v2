import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb, COLLECTIONS } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/auth/session";
import {
  ACTIVE_LIFESPAN_DAYS,
  CLOSED_VISIBLE_HOURS,
  DEFAULT_MAX_CONTACTS,
  FEED_PAGE_SIZE,
} from "@/lib/constants";
import { normalize, toMillis } from "@/lib/format";
import type { FeedFilters, Product, ProductContact } from "@/types";

/**
 * Acceso a las publicaciones. Todo el archivo corre en el servidor.
 *
 * Decisión de consulta: se traen las publicaciones ordenadas por fecha con un tope y
 * después se filtra en memoria por categoría, barrio, estado y texto. Alternativa
 * sería armar índices compuestos para cada combinación de filtros, que en Firestore
 * significa un índice por permutación y un error "the query requires an index" cada
 * vez que se agrega un filtro nuevo — que es justamente lo que hacía fallar en
 * silencio a la versión anterior.
 *
 * Para el volumen de Mesira (cientos de publicaciones activas) esto es más rápido y
 * mucho más robusto. Si algún día hay más de ~2000 activas, el cambio es mover la
 * búsqueda a un índice de texto externo; está anotado en CONTINUAR.md.
 */

const QUERY_LIMIT = 400;

function productFromDoc(
  id: string,
  data: FirebaseFirestore.DocumentData,
  includePrivateFields: boolean,
): Product {
  const images = Array.isArray(data.images)
    ? data.images
        .filter((img: unknown): img is Record<string, unknown> => typeof img === "object" && img !== null)
        .map((img) => ({
          url: String(img.url ?? ""),
          path: String(img.path ?? ""),
          width: Number(img.width ?? 0) || 800,
          height: Number(img.height ?? 0) || 1000,
        }))
        .filter((img) => img.url)
    : [];

  const base: Product = {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    categories: Array.isArray(data.categories) ? data.categories : [],
    condition: data.condition ?? "bueno",
    neighborhood: data.neighborhood ?? "otro",
    customNeighborhood: data.customNeighborhood ?? null,
    images,
    status: data.status ?? "available",
    ownerId: String(data.ownerId ?? ""),
    ownerName: String(data.ownerName ?? "Alguien de la comunidad"),
    ownerKehila: data.ownerKehila ?? null,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    closedAt: data.closedAt ? toMillis(data.closedAt) : null,
    maxContacts: Number(data.maxContacts ?? DEFAULT_MAX_CONTACTS),
    contactCount: Number(data.contactCount ?? 0),
    viewCount: Number(data.viewCount ?? 0),
  };

  if (includePrivateFields) {
    base.contactedUserIds = Array.isArray(data.contactedUserIds) ? data.contactedUserIds : [];
    base.reactivationRequested = data.reactivationRequested === true;
  }

  return base;
}

/** Una publicación cerrada sigue en el tablero 48 h; una activa, 60 días. */
function isVisibleInFeed(product: Product, now: number): boolean {
  if (product.status === "removed") return false;

  const ageMs = now - product.createdAt;
  if (ageMs > ACTIVE_LIFESPAN_DAYS * 86_400_000) return false;

  if (product.status === "available") return true;

  const closedAt = product.closedAt ?? product.updatedAt;
  return now - closedAt < CLOSED_VISIBLE_HOURS * 3_600_000;
}

function matchesFilters(product: Product, filters: FeedFilters): boolean {
  if (filters.categories.length > 0) {
    if (!product.categories.some((c) => filters.categories.includes(c))) return false;
  }
  if (filters.neighborhoods.length > 0) {
    if (!filters.neighborhoods.includes(product.neighborhood)) return false;
  }
  if (filters.conditions.length > 0) {
    if (!filters.conditions.includes(product.condition)) return false;
  }
  if (filters.q.trim()) {
    const needle = normalize(filters.q.trim());
    const haystack = normalize(
      `${product.title} ${product.description} ${product.customNeighborhood ?? ""}`,
    );
    // Todas las palabras de la búsqueda tienen que aparecer, en cualquier orden.
    const words = needle.split(/\s+/).filter(Boolean);
    if (!words.every((w) => haystack.includes(w))) return false;
  }
  return true;
}

export interface FeedResult {
  products: Product[];
  total: number;
  hasMore: boolean;
}

export async function getFeed(filters: FeedFilters, page = 0): Promise<FeedResult> {
  const now = Date.now();
  const cutoff = Timestamp.fromMillis(now - ACTIVE_LIFESPAN_DAYS * 86_400_000);

  const snap = await adminDb()
    .collection(COLLECTIONS.products)
    .where("createdAt", ">=", cutoff)
    .orderBy("createdAt", "desc")
    .limit(QUERY_LIMIT)
    .get();

  const all = snap.docs
    .map((doc) => productFromDoc(doc.id, doc.data(), false))
    .filter((p) => isVisibleInFeed(p, now))
    .filter((p) => matchesFilters(p, filters));

  const start = page * FEED_PAGE_SIZE;
  const slice = all.slice(start, start + FEED_PAGE_SIZE);

  return { products: slice, total: all.length, hasMore: start + FEED_PAGE_SIZE < all.length };
}

/** Cuántas publicaciones hay disponibles ahora mismo. Se muestra en el tablero. */
export async function countAvailable(): Promise<number> {
  const now = Date.now();
  const cutoff = Timestamp.fromMillis(now - ACTIVE_LIFESPAN_DAYS * 86_400_000);
  const snap = await adminDb()
    .collection(COLLECTIONS.products)
    .where("status", "==", "available")
    .where("createdAt", ">=", cutoff)
    .count()
    .get();
  return snap.data().count;
}

export async function getProduct(
  id: string,
  viewer?: { uid: string; isAdmin: boolean } | null,
): Promise<Product | null> {
  if (!id || id.length > 200) return null;

  const snap = await adminDb().collection(COLLECTIONS.products).doc(id).get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  const isOwner = viewer?.uid === data.ownerId;
  const canSeeEverything = Boolean(isOwner || viewer?.isAdmin);

  const product = productFromDoc(snap.id, data, canSeeEverything);

  // Una publicación dada de baja por moderación solo la ve su dueño o un admin.
  if (product.status === "removed" && !canSeeEverything) return null;

  return product;
}

export async function getUserProducts(ownerId: string): Promise<Product[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.products)
    .where("ownerId", "==", ownerId)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  return snap.docs.map((doc) => productFromDoc(doc.id, doc.data(), true));
}

/** Reserva un id nuevo sin escribir todavía, para poder subir las fotos antes. */
export function newProductRef() {
  return adminDb().collection(COLLECTIONS.products).doc();
}

export async function writeProduct(
  ref: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.DocumentData,
  contact: ProductContact,
): Promise<void> {
  const batch = adminDb().batch();
  batch.set(ref, data);
  batch.set(ref.collection("private").doc("contact"), contact);
  await batch.commit();
}

export async function updateProduct(
  id: string,
  data: FirebaseFirestore.DocumentData,
  contact?: Partial<ProductContact>,
): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.products).doc(id);
  const batch = adminDb().batch();
  batch.update(ref, { ...data, updatedAt: FieldValue.serverTimestamp() });
  if (contact) {
    batch.set(ref.collection("private").doc("contact"), contact, { merge: true });
  }
  await batch.commit();
}

export async function deleteProductDoc(id: string): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.products).doc(id);
  const privateDocs = await ref.collection("private").listDocuments();
  const batch = adminDb().batch();
  for (const doc of privateDocs) batch.delete(doc);
  batch.delete(ref);
  await batch.commit();
}

export interface ContactReveal {
  contact: ProductContact;
  contactCount: number;
  status: Product["status"];
  alreadyContacted: boolean;
}

/**
 * Revela el contacto del donante y, si es la primera vez para esta persona,
 * lo registra contra el límite de contactos.
 *
 * Todo pasa dentro de una transacción para que dos pedidos simultáneos no puedan
 * pasarse del límite, y corre solo acá: el documento público nunca tuvo el teléfono,
 * así que no hay forma de esquivar este camino leyendo Firestore directamente.
 */
export async function revealContact(
  productId: string,
  uid: string,
): Promise<ContactReveal> {
  const productRef = adminDb().collection(COLLECTIONS.products).doc(productId);
  const contactRef = productRef.collection("private").doc("contact");

  return adminDb().runTransaction(async (tx) => {
    const [productSnap, contactSnap] = await Promise.all([tx.get(productRef), tx.get(contactRef)]);

    if (!productSnap.exists) throw new ApiError(404, "Esta publicación ya no existe.");

    const data = productSnap.data()!;
    const isOwner = data.ownerId === uid;
    const contactedUserIds: string[] = Array.isArray(data.contactedUserIds)
      ? data.contactedUserIds
      : [];
    const alreadyContacted = contactedUserIds.includes(uid);

    let contactCount = Number(data.contactCount ?? 0);
    let status: Product["status"] = data.status ?? "available";

    if (!isOwner && !alreadyContacted) {
      if (status !== "available") {
        throw new ApiError(409, "Esta publicación ya está cerrada. Buscá otra parecida en el tablero.");
      }

      const maxContacts = Number(data.maxContacts ?? DEFAULT_MAX_CONTACTS);
      contactCount += 1;
      const reachedLimit = contactCount >= maxContacts;
      status = reachedLimit ? "closed" : "available";

      tx.update(productRef, {
        contactCount,
        contactedUserIds: FieldValue.arrayUnion(uid),
        status,
        updatedAt: FieldValue.serverTimestamp(),
        ...(reachedLimit ? { closedAt: FieldValue.serverTimestamp() } : {}),
      });
    }

    const contactData = contactSnap.data();
    if (!contactData?.phone) {
      throw new ApiError(
        404,
        "Esta publicación no tiene datos de contacto cargados. Avisanos y la revisamos.",
      );
    }

    return {
      contact: {
        phone: String(contactData.phone),
        email: contactData.email ? String(contactData.email) : null,
        preferWhatsapp: contactData.preferWhatsapp !== false,
      },
      contactCount,
      status,
      alreadyContacted: alreadyContacted || isOwner,
    };
  });
}

/** Suma una visita, una sola vez por persona. Nunca hace fallar el render. */
export async function registerView(productId: string, viewerId: string): Promise<void> {
  try {
    const ref = adminDb().collection(COLLECTIONS.products).doc(productId);
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const viewed: string[] = snap.data()?.viewedUserIds ?? [];
      if (viewed.includes(viewerId)) return;
      tx.update(ref, {
        viewCount: FieldValue.increment(1),
        viewedUserIds: FieldValue.arrayUnion(viewerId),
      });
    });
  } catch (error) {
    console.error("[products] no se pudo registrar la visita:", error);
  }
}
