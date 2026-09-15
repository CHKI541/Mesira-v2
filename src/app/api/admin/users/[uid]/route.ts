import { revalidatePath } from "next/cache";

import { handle, ok, readJson } from "@/lib/api";
import { ApiError, isAdminToken, requireAdmin } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { getProfile, setUserDisabled } from "@/lib/data/users";
import { adminUserActionSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ uid: string }> };

/**
 * Habilita o deshabilita una cuenta.
 *
 * Dos protecciones que la versión anterior no tenía del lado del servidor: un
 * administrador no puede deshabilitarse a sí mismo, y no puede deshabilitar a otro
 * administrador. Antes eso era solo un `disabled` en un botón del panel, o sea,
 * nada — bastaba con llamar a la API a mano.
 */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const admin = await requireAdmin();
    const { uid } = await params;
    const { action } = adminUserActionSchema.parse(await readJson(request, 8 * 1024));

    if (uid === admin.uid) {
      throw new ApiError(400, "No podés cambiar el estado de tu propia cuenta.");
    }

    const profile = await getProfile(uid);
    if (!profile) throw new ApiError(404, "Ese usuario no existe.");

    const record = await adminAuth().getUser(uid);
    const targetIsAdmin = isAdminToken({
      email: record.email,
      admin: record.customClaims?.admin,
    });
    if (targetIsAdmin) {
      throw new ApiError(403, "No se puede modificar la cuenta de otro administrador.");
    }

    await setUserDisabled(uid, action === "disable");

    revalidatePath("/admin");
    return ok({ disabled: action === "disable" });
  });
}
