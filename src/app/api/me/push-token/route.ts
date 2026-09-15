import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { setPushToken, updateProfile } from "@/lib/data/users";
import { pushTokenSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registra o quita el token de push de este dispositivo.
 *
 * El token lo genera Firebase Messaging en el navegador y se guarda en el perfil.
 * Una persona puede tener varios (celular, tablet, escritorio), por eso es un array
 * y no un campo único.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser();
    const { token, action } = pushTokenSchema.parse(await readJson(request, 16 * 1024));

    await setPushToken(user.uid, token, action);

    // Registrar un dispositivo implica querer recibir push; quitar el último, no.
    if (action === "add") {
      await updateProfile(user.uid, { notifyByPush: true });
    }

    return ok({ registered: action === "add" });
  });
}
