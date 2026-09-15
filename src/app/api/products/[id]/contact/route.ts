import { revalidatePath } from "next/cache";

import { handle, ok } from "@/lib/api";
import { ApiError, requireCompleteUser } from "@/lib/auth/session";
import { getProduct, revealContact } from "@/lib/data/products";
import { getProfile } from "@/lib/data/users";
import { contactNoticeEmail, sendEmail } from "@/lib/notify/email";
import { consumeRate } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Revela el teléfono del donante y registra el contacto contra el límite.
 *
 * Esta es la ruta más sensible de la aplicación: es lo único que separa los datos
 * personales de las personas de cualquiera que pase por la web. Por eso exige, en
 * este orden: sesión válida, perfil completo, cupo de frecuencia disponible, y una
 * transacción que impide pasarse del límite aunque lleguen dos pedidos a la vez.
 *
 * El dato nunca estuvo en el documento público, así que no hay forma de obtenerlo
 * leyendo Firestore por afuera de acá.
 */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireCompleteUser();
    await consumeRate("revealContact", user.uid);

    const { id } = await params;

    const product = await getProduct(id, { uid: user.uid, isAdmin: user.isAdmin });
    if (!product) throw new ApiError(404, "Esa publicación ya no existe.");
    if (product.status === "removed") {
      throw new ApiError(410, "Esta publicación fue dada de baja.");
    }

    const result = await revealContact(id, user.uid);

    // Aviso al donante, solo la primera vez que esta persona pide su contacto.
    const isOwner = product.ownerId === user.uid;
    if (!isOwner && !result.alreadyContacted) {
      void notifyOwner(product.ownerId, {
        productId: product.id,
        productTitle: product.title,
        contactCount: result.contactCount,
        maxContacts: product.maxContacts,
        interested: user,
      });
    }

    revalidatePath(`/producto/${id}`);
    if (result.status !== product.status) revalidatePath("/");

    return ok({
      phone: result.contact.phone,
      email: result.contact.email,
      preferWhatsapp: result.contact.preferWhatsapp,
      contactCount: result.contactCount,
      status: result.status,
      alreadyContacted: result.alreadyContacted,
    });
  });
}

async function notifyOwner(
  ownerId: string,
  data: {
    productId: string;
    productTitle: string;
    contactCount: number;
    maxContacts: number;
    interested: { uid: string; email: string; profile: { firstName: string; lastName: string; phone: string } | null };
  },
): Promise<void> {
  try {
    const owner = await getProfile(ownerId);
    if (!owner?.email || !owner.notifyByEmail) return;

    const interested = data.interested.profile;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mesira.net";

    const built = contactNoticeEmail({
      ownerName: owner.firstName,
      interestedName: interested ? `${interested.firstName} ${interested.lastName}` : "Alguien",
      interestedPhone: interested?.phone ?? "",
      interestedEmail: data.interested.email,
      productTitle: data.productTitle,
      productUrl: `${siteUrl}/producto/${data.productId}`,
      contactCount: data.contactCount,
      maxContacts: data.maxContacts,
    });

    await sendEmail({ to: owner.email, ...built });
  } catch (error) {
    console.error("[contact] no se pudo avisar al donante:", error);
  }
}
