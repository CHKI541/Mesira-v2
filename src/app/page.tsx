import Link from "next/link";
import { Suspense } from "react";

import { ActiveFilters, CategoryRail, FilterSidebar } from "@/components/feed/FilterRail";
import { ProductCard, ProductCardSkeleton } from "@/components/feed/ProductCard";
import { FirstVisitStrip } from "@/components/feed/FirstVisitStrip";
import { ButtonLink } from "@/components/ui/Button";
import { getFeed } from "@/lib/data/products";
import { getSessionUser } from "@/lib/auth/session";
import { CATEGORY_VALUES, CONDITION_VALUES, NEIGHBORHOOD_VALUES } from "@/lib/constants";
import { dayLabel } from "@/lib/format";
import type { FeedFilters, Product } from "@/types";

export const dynamic = "force-dynamic";

/**
 * El tablero.
 *
 * No hay hero: lo primero que se ve son los artículos de hoy. La explicación de qué
 * es Mesira va en una franja fina y descartable arriba, y en tres pasos debajo de la
 * primera tanda, donde alguien que llega por primera vez ya entendió de qué se trata
 * mirando las fotos. Ver DESIGN.md.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readList(raw: string | string[] | undefined, allowed: readonly string[]): string[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => allowed.includes(v));
}

function parseFilters(params: Record<string, string | string[] | undefined>): FeedFilters {
  const q = params.q;
  return {
    q: (Array.isArray(q) ? q[0] : q)?.slice(0, 80) ?? "",
    categories: readList(params.categoria, CATEGORY_VALUES) as FeedFilters["categories"],
    neighborhoods: readList(params.barrio, NEIGHBORHOOD_VALUES) as FeedFilters["neighborhoods"],
    conditions: readList(params.estado, CONDITION_VALUES) as FeedFilters["conditions"],
  };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
      <FirstVisitStrip signedIn={Boolean(user)} />

      <div className="flex gap-8 py-5">
        <FilterSidebar />

        <div className="min-w-0 flex-1">
          <CategoryRail />

          <Suspense fallback={<FeedSkeleton />}>
            <Feed filters={filters} showIntro={!user} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function Feed({ filters, showIntro }: { filters: FeedFilters; showIntro: boolean }) {
  let result: Awaited<ReturnType<typeof getFeed>>;

  try {
    result = await getFeed(filters, 0);
  } catch (error) {
    console.error("[feed] no se pudo cargar el tablero:", error);
    return (
      <div className="mt-6 rounded-card border border-clay/30 bg-clay-soft px-4 py-6 text-body text-clay">
        <p className="font-semibold">No pudimos cargar el tablero.</p>
        <p className="mt-1">
          Recargá la página en unos segundos. Si sigue igual, escribinos a{" "}
          {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@mesira.net"}.
        </p>
      </div>
    );
  }

  const { products, total } = result;
  const groups = groupByDay(products);

  return (
    <>
      <div className="mt-4">
        <ActiveFilters total={total} />
      </div>

      {products.length === 0 ? (
        <EmptyState filtering={isFiltering(filters)} />
      ) : (
        <div className="flex flex-col gap-9 pt-5">
          {groups.map(([label, items], groupIndex) => (
            <section key={label}>
              <div className="flex items-baseline gap-3 border-b border-rule pb-2">
                <h2 className="text-h2 font-bold text-ink">{label}</h2>
                <span className="text-small text-ink-2 tabular-nums">
                  {items.length} {items.length === 1 ? "artículo" : "artículos"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-7 pt-5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {items.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={groupIndex === 0 && index < 4}
                  />
                ))}
              </div>

              {groupIndex === 0 && showIntro ? <HowItWorks /> : null}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function isFiltering(filters: FeedFilters): boolean {
  return Boolean(
    filters.q.trim() ||
      filters.categories.length ||
      filters.neighborhoods.length ||
      filters.conditions.length,
  );
}

function groupByDay(products: Product[]): Array<[string, Product[]]> {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const label = dayLabel(product.createdAt);
    const list = groups.get(label);
    if (list) list.push(product);
    else groups.set(label, [product]);
  }
  return [...groups.entries()];
}

/** Los tres pasos. Es una secuencia real, así que acá los números sí significan algo. */
function HowItWorks() {
  const steps = [
    {
      title: "Encontrá lo que necesitás",
      text: "Buscá por palabra o filtrá por barrio y categoría. Todo lo que ves está disponible ahora.",
    },
    {
      title: "Pedí el contacto",
      text: "Entrás con tu cuenta de Google y te damos el celular de quien lo regala. Le escribís por WhatsApp.",
    },
    {
      title: "Coordinan la entrega",
      text: "Se ponen de acuerdo entre ustedes dónde y cuándo. Mesira no cobra nada, nunca.",
    },
  ];

  return (
    <div className="mt-9 border-t border-rule pt-7">
      <h2 className="text-h2 font-bold text-ink">Cómo funciona</h2>
      <ol className="mt-5 grid gap-6 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-dot border border-rule-strong text-small font-bold text-ink-2 tabular-nums">
              {index + 1}
            </span>
            <div>
              <h3 className="text-h3 font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 font-serif text-prose leading-relaxed text-ink-2">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Una pantalla vacía es una invitación a hacer algo. */
function EmptyState({ filtering }: { filtering: boolean }) {
  return (
    <div className="max-w-lg py-16">
      <h2 className="text-display font-extrabold text-ink">
        {filtering ? "Nada coincide con esa búsqueda" : "El tablero está vacío"}
      </h2>
      <p className="mt-3 font-serif text-prose leading-relaxed text-ink-2">
        {filtering
          ? "Probá con menos filtros, o creá una alerta y te avisamos apenas alguien publique algo así."
          : "Todavía no hay nada publicado. Podés ser quien lo empieza: si tenés algo en buen estado guardado sin usar, hoy es un buen día."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/publicar">Publicar una mitzvá</ButtonLink>
        {filtering ? (
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-card border border-rule-strong bg-surface px-4 text-body font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            Ver todo el tablero
          </Link>
        ) : (
          <Link
            href="/mi-cuenta?seccion=alertas"
            className="inline-flex h-11 items-center rounded-card border border-rule-strong bg-surface px-4 text-body font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            Crear una alerta
          </Link>
        )}
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="pt-9">
      <div className="skeleton h-6 w-28 rounded-chip" />
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
