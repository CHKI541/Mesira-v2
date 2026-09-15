import { revalidatePath } from "next/cache";

import { handle, ok, readJson } from "@/lib/api";
import { ApiError, requireCompleteUser } from "@/lib/auth/session";
import { deleteProductDoc, getProduct, updateProduct } from "@/lib/data/products";
import { deleteImages, uploadProductImages } from "@/lib/images";
import { updateProductSchema } from "@/lib/validation";
import type { ProductImage } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** Edita una publicación. Solo el dueño o un administrador. */
export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireCompleteUser();
    const { id } = await params;

    const product = await getProduct(id, { uid: user.uid, isAdmin: user.isAdmin });
    if (!product) throw new ApiError(404, "Esa publicación ya no existe.");
    if (product.ownerId !== user.uid && !user.isAdmin) {
      throw new ApiError(403, "Solo quien publicó puede editar esta mitzvá.");
    }

    const input = updateProductSchema.parse(await readJson(request));

    if (input.neighborhood === "otro" && !input.customNeighborhood?.trim()) {
      throw new ApiError(422, "Escribí el nombre del barrio.");
    }

    // Solo se conservan rutas que realmente pertenecen a esta publicación: si no,
    // alguien podría adjuntar la foto de otro producto a la suya.
    const ownPaths = new Set(product.images.map((i) => i.path));
    const kept: ProductImage[] = product.images.filter((img) =>
      input.keepImagePaths.includes(img.path),
    );
    const invalid = input.keepImagePaths.filter((p) => !ownPaths.has(p));
    if (invalid.length > 0) {
      throw new ApiError(422, "Alguna de las fotos que querés conservar ya no pertenece a esta publicación.");
    }

    const uploaded =
      input.newImages.length > 0 ? await uploadProductImages(product.id, input.newImages) : [];
    const images = [...kept, ...uploaded];

    const removedPaths = product.images
      .filter((img) => !input.keepImagePaths.includes(img.path))
      .map((img) => img.path);

    await updateProduct(product.id, {
      title: input.title,
      description: input.description,
      categories: input.categories,
      condition: input.condition,
      neighborhood: input.neighborhood,
      customNeighborhood: input.neighborhood === "otro" ? input.customNeighborhood?.trim() : null,
      maxContacts: input.maxContacts,
      images,
    });

    await deleteImages(removedPaths);

    revalidatePath("/");
    revalidatePath(`/producto/${product.id}`);
    revalidatePath("/mi-cuenta");

    return ok({ id: product.id });
  });
}

/** Borra una publicación y sus fotos. Solo el dueño o un administrador. */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireCompleteUser();
    const { id } = await params;

    const product = await getProduct(id, { uid: user.uid, isAdmin: user.isAdmin });
    if (!product) throw new ApiError(404, "Esa publicación ya no existe.");
    if (product.ownerId !== user.uid && !user.isAdmin) {
      throw new ApiError(403, "Solo quien publicó puede borrar esta mitzvá.");
    }

    await deleteProductDoc(product.id);
    await deleteImages(product.images.map((i) => i.path));

    revalidatePath("/");
    revalidatePath("/mi-cuenta");

    return ok({ deleted: true });
  });
}
