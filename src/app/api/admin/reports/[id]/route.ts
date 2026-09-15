import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

import { handle, ok } from "@/lib/api";
import { ApiError, requireAdmin } from "@/lib/auth/session";
import { adminDb, COLLECTIONS } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Marca un reporte como revisado. */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;

    const ref = adminDb().collection(COLLECTIONS.reports).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Ese reporte ya no existe.");

    await ref.update({
      resolved: true,
      resolvedBy: admin.uid,
      resolvedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin");
    return ok({ resolved: true });
  });
}
