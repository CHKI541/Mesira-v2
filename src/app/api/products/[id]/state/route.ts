import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

import { handle, ok, readJson } from "@/lib/api";
import { ApiError, requireCompleteUser } from "@/lib/auth/session";
import { getProduct, updateProduct } from "@/lib/data/products";
import { productStateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Cambia el estado de una publicación: cerrarla, reabrirla o marcarla entregada.
 *
 * Reabrir reinicia el contador de contactos y la fecha, así vuelve al principio del
 * tablero como si fuera nueva. Es la misma lógica de antes, pero acá el único que
 * puede hacerlo es el dueño (o la moderación), verificado en el servidor.
 */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireCompleteUser();
    const { id } = await params;
    const { action } = productStateSchema.parse(await readJson(request, 8 * 1024));

    const product = await getProduct(id, { uid: user.uid, isAdmin: user.isAdmin });
    if (!product) throw new ApiError(404, "Esa publicación ya no existe.");

    const isOwner = product.ownerId === user.uid;
    if (!isOwner && !user.isAdmin) {
      throw new ApiError(403, "Solo quien publicó puede cambiar el estado de esta mitzvá.");
    }
    if (product.status === "removed" && !user.isAdmin) {
      throw new ApiError(
        403,
        "Esta publicación fue dada de baja por la moderación. Escribinos si creés que fue un error.",
      );
    }

    switch (action) {
      case "close":
        await updateProduct(id, { status: "closed", closedAt: FieldValue.serverTimestamp() });
        break;

      case "deliver":
        await updateProduct(id, {
          status: "delivered",
          closedAt: FieldValue.serverTimestamp(),
          reactivationRequested: false,
        });
        break;

      case "reopen":
        await updateProduct(id, {
          status: "available",
          contactCount: 0,
          contactedUserIds: [],
          closedAt: null,
          reactivationRequested: false,
          // Vuelve al tope del tablero: para quien la mira es una publicación nueva.
          createdAt: FieldValue.serverTimestamp(),
        });
        break;

      case "request-reactivation":
        await updateProduct(id, { reactivationRequested: true });
        break;
    }

    revalidatePath("/");
    revalidatePath(`/producto/${id}`);
    revalidatePath("/mi-cuenta");

    return ok({ action });
  });
}
