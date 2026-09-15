import type { Metadata } from "next";
import Link from "next/link";

import { ProductForm } from "@/components/product/ProductForm";
import { SignInPrompt } from "@/components/layout/SignInPrompt";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publicar una mitzvá",
  description: "Publicá gratis algo que ya no usás para que lo aproveche alguien de la comunidad.",
  robots: { index: false },
};

export default async function PublishPage() {
  const user = await getSessionUser().catch(() => null);

  if (!user) {
    return (
      <SignInPrompt
        title="Entrá para publicar"
        body="Necesitás una cuenta para publicar. Entrá con Google: es gratis y toma unos segundos."
      />
    );
  }

  if (!user.profileComplete) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
        <h1 className="text-display font-extrabold text-ink">Falta completar tu perfil</h1>
        <p className="mt-3 font-serif text-prose leading-relaxed text-ink-2">
          Para publicar necesitamos tu nombre, tu celular y tu kehilá. El celular se lo damos
          solamente a quien pide el contacto de algo que publicaste.
        </p>
        <Link
          href="/mi-cuenta?seccion=perfil"
          className="mt-6 inline-flex h-12 items-center rounded-card bg-green px-6 text-body font-semibold text-on-green transition-colors hover:bg-green-hover"
        >
          Completar mi perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <div className="py-6">
        <Link href="/" className="text-small text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          Tablero
        </Link>
        <h1 className="mt-3 text-display font-extrabold text-ink">Publicar una mitzvá</h1>
        <p className="mt-2 font-serif text-prose leading-relaxed text-ink-2">
          Todo lo que se publica acá se regala. Si pensás pedir algo a cambio, este no es el lugar.
        </p>
      </div>

      <ProductForm />
    </div>
  );
}
