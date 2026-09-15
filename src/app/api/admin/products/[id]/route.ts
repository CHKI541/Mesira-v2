import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

import { handle, ok, readJson } from "@/lib/api";
import { ApiError, requireAdmin } from "@/lib/auth/session";
import { deleteProductDoc, getProduct, updateProduct } from "@/lib/data/products";
import { deleteImages } from "@/lib/images";
import { adminProductActionSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Moderación de publicaciones: dar de baja, restaurar o reabrir. */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const { action } = adminProductActionSchema.parse(await readJson(request, 8 * 1024));

    const product = await getProduct(id, { uid: admin.uid, isAdmin: true });
    if (!product) throw new ApiError(404, "Esa publicación ya no existe.");

    switch (action) {
      case "remove":
        await updateProduct(id, {
          status: "removed",
          closedAt: FieldValue.serverTimestamp(),
          moderatedBy: admin.uid,
          moderatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case "restore":
      case "reopen":
        await updateProduct(id, {
          status: "available",
          contactCount: action === "reopen" ? 0 : product.contactCount,
          contactedUserIds: action === "reopen" ? [] : undefined,
          closedAt: null,
          reactivationRequested: false,
          moderatedBy: admin.uid,
          moderatedAt: FieldValue.serverTimestamp(),
        });
        break;
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/producto/${id}`);

    return ok({ action });
  });
}

/** Borrado definitivo, con sus fotos. */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;

    const product = await getProduct(id, { uid: admin.uid, isAdmin: true });
    if (!product) throw new ApiError(404, "Esa publicación ya no existe.");

    await deleteProductDoc(id);
    await deleteImages(product.images.map((i) => i.path));

    revalidatePath("/");
    revalidatePath("/admin");

    return ok({ deleted: true });
  });
}
