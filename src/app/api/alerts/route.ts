import { revalidatePath } from "next/cache";

import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { createAlert, getUserAlerts } from "@/lib/data/alerts";
import { consumeRate } from "@/lib/rate-limit";
import { alertSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(async () => {
    const user = await requireUser();
    return ok(await getUserAlerts(user.uid));
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser();
    await consumeRate("createAlert", user.uid);

    const input = alertSchema.parse(await readJson(request, 16 * 1024));
    const alert = await createAlert(user.uid, input);

    revalidatePath("/mi-cuenta");
    return ok(alert);
  });
}
