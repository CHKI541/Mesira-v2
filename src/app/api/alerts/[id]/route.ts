import { revalidatePath } from "next/cache";

import { handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { deleteAlert } from "@/lib/data/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;

    // deleteAlert verifica que la alerta sea de quien la pide.
    await deleteAlert(user.uid, id);

    revalidatePath("/mi-cuenta");
    return ok({ deleted: true });
  });
}
