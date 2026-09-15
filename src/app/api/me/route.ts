import { revalidatePath } from "next/cache";

import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { getProfile, updateProfile } from "@/lib/data/users";
import { consumeRate } from "@/lib/rate-limit";
import { notificationPrefsSchema, profileSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Guarda los datos del perfil. El teléfono se normaliza a E.164 en el esquema. */
export async function PATCH(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser();
    await consumeRate("updateProfile", user.uid);

    const body = await readJson(request, 32 * 1024);
    const input = profileSchema.parse(body);

    await updateProfile(user.uid, {
      email: user.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      kehila: input.kehila,
      neighborhood: input.neighborhood ?? null,
    });

    revalidatePath("/mi-cuenta");
    return ok(await getProfile(user.uid));
  });
}

/** Preferencias de aviso: por qué canal y con qué frecuencia. */
export async function PUT(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser();
    await consumeRate("updateProfile", user.uid);

    const input = notificationPrefsSchema.parse(await readJson(request, 8 * 1024));
    await updateProfile(user.uid, input);

    revalidatePath("/mi-cuenta");
    return ok(await getProfile(user.uid));
  });
}
