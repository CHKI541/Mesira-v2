import { FieldValue } from "firebase-admin/firestore";

import { handle, ok, readJson } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth/session";
import { adminDb, COLLECTIONS } from "@/lib/firebase/admin";
import { getProduct } from "@/lib/data/products";
import { consumeRate } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Reporta una publicación.
 *
 * Es una función nueva: la versión anterior no tenía ninguna forma de avisar que
 * algo estaba mal, y en una plataforma abierta donde la gente publica fotos y datos
 * de contacto eso es un problema de seguridad, no solo de comodidad.
 */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser();
    await consumeRate("report", user.uid);

    const { id } = await params;
    const input = reportSchema.parse(await readJson(request, 16 * 1024));

    const product = await getProduct(id, { uid: user.uid, isAdmin: user.isAdmin });
    if (!product) throw new ApiError(404, "Esa publicación ya no existe.");

    const reports = adminDb().collection(COLLECTIONS.reports);

    // Una persona reporta una publicación una sola vez.
    const existing = await reports
      .where("productId", "==", id)
      .where("reporterId", "==", user.uid)
      .limit(1)
      .get();

    if (!existing.empty) {
      return ok({ alreadyReported: true });
    }

    await reports.add({
      productId: id,
      productTitle: product.title,
      reporterId: user.uid,
      reporterEmail: user.email,
      reason: input.reason,
      detail: input.detail?.trim() || null,
      resolved: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return ok({ alreadyReported: false });
  });
}
