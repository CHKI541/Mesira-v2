import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductForm } from "@/components/product/ProductForm";
import { getSessionUser } from "@/lib/auth/session";
import { getProduct } from "@/lib/data/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar publicación",
  robots: { index: false },
};

type Params = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser().catch(() => null);

  if (!user) redirect(`/producto/${id}`);

  const product = await getProduct(id, { uid: user.uid, isAdmin: user.isAdmin });
  if (!product) notFound();

  // El servidor vuelve a verificar esto en la ruta de la API; acá es para no
  // mostrar un formulario que después va a rebotar.
  if (product.ownerId !== user.uid && !user.isAdmin) {
    redirect(`/producto/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <div className="py-6">
        <Link
          href={`/producto/${product.id}`}
          className="text-small text-ink-2 underline-offset-4 hover:text-ink hover:underline"
        >
          Volver a la publicación
        </Link>
        <h1 className="mt-3 text-display font-extrabold text-ink">Editar publicación</h1>
      </div>

      <ProductForm product={product} />
    </div>
  );
}
