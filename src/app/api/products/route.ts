import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

import { handle, ok, readJson } from "@/lib/api";
import { ApiError, requireCompleteUser } from "@/lib/auth/session";
import { newProductRef, writeProduct } from "@/lib/data/products";
import { deleteImages, uploadProductImages } from "@/lib/images";
import { dispatchNewProductNotifications } from "@/lib/notify/dispatch";
import { consumeRate } from "@/lib/rate-limit";
import { createProductSchema } from "@/lib/validation";
import type { Product } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Las fotos llegan como data URL, así que el cuerpo puede ser de un par de megas. */
export const maxDuration = 60;

/**
 * Crea una publicación.
 *
 * Orden de las operaciones, que importa:
 *  1. Verificar sesión y perfil completo.
 *  2. Consumir cupo de frecuencia.
 *  3. Validar TODO el cuerpo.
 *  4. Reservar un id.
 *  5. Subir las fotos a Storage.
 *  6. Escribir el documento público y el privado en un batch, así no puede quedar
 *     una publicación sin datos de contacto.
 *  7. Recién ahí despachar los avisos.
 *
 * Si la escritura falla después de subir las fotos, se borran los archivos para no
 * dejar basura huérfana en Storage.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireCompleteUser();
    await consumeRate("createProduct", user.uid);

    const input = createProductSchema.parse(await readJson(request));

    if (input.neighborhood === "otro" && !input.customNeighborhood?.trim()) {
      throw new ApiError(422, "Escribí el nombre del barrio.");
    }

    const profile = user.profile!;
    const ref = newProductRef();
    const images = await uploadProductImages(ref.id, input.images);

    try {
      await writeProduct(
        ref,
        {
          title: input.title,
          description: input.description,
          categories: input.categories,
          condition: input.condition,
          neighborhood: input.neighborhood,
          customNeighborhood: input.neighborhood === "otro" ? input.customNeighborhood?.trim() : null,
          images,
          status: "available",
          ownerId: user.uid,
          ownerName: `${profile.firstName} ${profile.lastName.charAt(0)}.`.trim(),
          ownerKehila: profile.kehila || null,
          maxContacts: input.maxContacts,
          contactCount: 0,
          viewCount: 0,
          contactedUserIds: [],
          viewedUserIds: [],
          reactivationRequested: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          closedAt: null,
        },
        {
          phone: profile.phone,
          email: input.shareEmail ? profile.email : null,
          preferWhatsapp: input.preferWhatsapp,
        },
      );
    } catch (error) {
      await deleteImages(images.map((i) => i.path));
      throw error;
    }

    const created: Product = {
      id: ref.id,
      title: input.title,
      description: input.description,
      categories: input.categories as Product["categories"],
      condition: input.condition as Product["condition"],
      neighborhood: input.neighborhood as Product["neighborhood"],
      customNeighborhood: input.neighborhood === "otro" ? (input.customNeighborhood ?? null) : null,
      images,
      status: "available",
      ownerId: user.uid,
      ownerName: `${profile.firstName} ${profile.lastName.charAt(0)}.`.trim(),
      ownerKehila: profile.kehila || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      closedAt: null,
      maxContacts: input.maxContacts,
      contactCount: 0,
      viewCount: 0,
    };

    // Los avisos no deben poder romper la publicación: si fallan, quedan en el log.
    try {
      await dispatchNewProductNotifications(created);
    } catch (error) {
      console.error("[products] falló el despacho de avisos:", error);
    }

    revalidatePath("/");
    revalidatePath("/mi-cuenta");

    return ok({ id: ref.id });
  });
}
