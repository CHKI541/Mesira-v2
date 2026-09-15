import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactPanel } from "@/components/product/ContactPanel";
import { Gallery } from "@/components/product/Gallery";
import { ReportDialog } from "@/components/product/ReportDialog";
import { StatusDot } from "@/components/ui/Chip";
import { getSessionUser } from "@/lib/auth/session";
import { getProduct, registerView } from "@/lib/data/products";
import { categoryLabel, conditionLabel, neighborhoodLabel, CONDITIONS } from "@/lib/constants";
import { fullDate, relativeTime, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id).catch(() => null);

  if (!product) return { title: "Publicación no encontrada" };

  const image = product.images[0]?.url;
  return {
    title: product.title,
    description: truncate(product.description, 155),
    openGraph: {
      title: product.title,
      description: truncate(product.description, 155),
      images: image ? [{ url: image }] : undefined,
      type: "article",
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser().catch(() => null);

  const product = await getProduct(id, user ? { uid: user.uid, isAdmin: user.isAdmin } : null);
  if (!product) notFound();

  // Las visitas no deben poder romper el renderizado de la página.
  if (user && user.uid !== product.ownerId) {
    void registerView(product.id, user.uid);
  }

  const alreadyContacted = Boolean(user && product.contactedUserIds?.includes(user.uid));
  const condition = CONDITIONS.find((c) => c.value === product.condition);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-16 sm:px-6">
      <nav aria-label="Migas" className="py-4 text-small">
        <Link href="/" className="text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          Tablero
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="min-w-0">
          <Gallery images={product.images} title={product.title} />

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusDot status={product.status} />
              <span className="text-small text-ink-2">
                Publicada {relativeTime(product.createdAt)}
              </span>
            </div>

            <h1 className="mt-2 text-display font-extrabold text-ink">{product.title}</h1>

            <p className="mt-2 text-body text-ink-2">
              {neighborhoodLabel(product.neighborhood, product.customNeighborhood)}
            </p>

            <div className="prose-mesira mt-6 whitespace-pre-line text-ink">
              {product.description}
            </div>

            <dl className="mt-8 border-t border-rule">
              <Row label="Estado">
                {conditionLabel(product.condition)}
                {condition?.hint ? (
                  <span className="text-ink-2"> ({condition.hint.toLowerCase()})</span>
                ) : null}
              </Row>
              <Row label="Categoría">
                {product.categories.map((c) => categoryLabel(c)).join(", ") || "Sin categoría"}
              </Row>
              <Row label="Lo regala">
                {product.ownerName}
                {product.ownerKehila ? (
                  <span className="text-ink-2"> de {product.ownerKehila}</span>
                ) : null}
              </Row>
              <Row label="Publicada el">{fullDate(product.createdAt)}</Row>
              {product.viewCount > 0 ? (
                <Row label="Vista por">
                  {product.viewCount} {product.viewCount === 1 ? "persona" : "personas"}
                </Row>
              ) : null}
            </dl>

            <div className="mt-6">
              <ReportDialog productId={product.id} signedIn={Boolean(user)} />
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <ContactPanel product={product} user={user} alreadyContacted={alreadyContacted} />

          {user?.isAdmin && user.uid !== product.ownerId ? (
            <div className="mt-4 rounded-card border border-rule bg-surface-2 p-4">
              <p className="text-small font-semibold text-ink">Vista de moderación</p>
              <p className="mt-1 text-small text-ink-2">
                {product.contactCount} de {product.maxContacts} contactos usados.
              </p>
              <Link
                href="/admin"
                className="mt-3 inline-block text-small font-medium text-ink underline underline-offset-4"
              >
                Ir al panel
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-rule py-3 sm:flex-row sm:gap-4">
      <dt className="text-small text-ink-2 sm:w-32 sm:shrink-0">{label}</dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  );
}
