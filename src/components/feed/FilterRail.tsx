"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Chip, RemovableChip } from "@/components/ui/Chip";
import {
  CATEGORIES,
  CONDITIONS,
  NEIGHBORHOODS,
  categoryLabel,
  conditionLabel,
} from "@/lib/constants";
import { cx } from "@/lib/format";

/**
 * Filtros.
 *
 * Todo el estado vive en la URL, no en React. Eso hace que un filtro se pueda
 * compartir por WhatsApp, que el botón "atrás" funcione, y que no haya dos fuentes
 * de verdad desincronizándose — que era exactamente el bug de los filtros viejos,
 * donde había un estado temporal, un estado aplicado, y un botón "Aplicar" en el medio.
 *
 * Acá cada clic aplica de inmediato. No hay botón de aplicar.
 */

const PARAM = {
  categories: "categoria",
  neighborhoods: "barrio",
  conditions: "estado",
} as const;

type Group = keyof typeof PARAM;

function useFilterUrl() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function read(group: Group): string[] {
    const raw = params.get(PARAM[group]);
    return raw ? raw.split(",").filter(Boolean) : [];
  }

  function toggle(group: Group, value: string) {
    const current = read(group);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const search = new URLSearchParams(params.toString());
    if (next.length > 0) search.set(PARAM[group], next.join(","));
    else search.delete(PARAM[group]);
    search.delete("pagina");

    startTransition(() => {
      router.push(search.toString() ? `/?${search}` : "/", { scroll: false });
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push("/", { scroll: false });
    });
  }

  function removeQuery() {
    const search = new URLSearchParams(params.toString());
    search.delete("q");
    startTransition(() => {
      router.push(search.toString() ? `/?${search}` : "/", { scroll: false });
    });
  }

  return { read, toggle, clearAll, removeQuery, pending, query: params.get("q") ?? "" };
}

/** Riel horizontal de categorías. Es lo que se ve en el celular. */
export function CategoryRail() {
  const { read, toggle, pending } = useFilterUrl();
  const active = read("categories");

  return (
    <div
      className={cx(
        "scroll-rail scroll-rail-hide -mx-4 flex gap-2 px-4 pb-1 transition-opacity lg:hidden",
        pending && "opacity-60",
      )}
    >
      {CATEGORIES.map((category) => (
        <Chip
          key={category.value}
          active={active.includes(category.value)}
          onClick={() => toggle("categories", category.value)}
        >
          {category.label}
        </Chip>
      ))}
    </div>
  );
}

/** Panel lateral de escritorio. Filetes y espacio, no una tarjeta enmarcada. */
export function FilterSidebar() {
  const { read, toggle, pending } = useFilterUrl();

  return (
    <aside
      aria-label="Filtros"
      className={cx("hidden w-52 shrink-0 lg:block", pending && "opacity-60 transition-opacity")}
    >
      <div className="sticky top-20 flex flex-col gap-7">
        <FilterGroup title="Categoría">
          {CATEGORIES.map((category) => (
            <FilterRow
              key={category.value}
              label={category.label}
              checked={read("categories").includes(category.value)}
              onToggle={() => toggle("categories", category.value)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Barrio">
          {NEIGHBORHOODS.map((neighborhood) => (
            <FilterRow
              key={neighborhood.value}
              label={neighborhood.label}
              checked={read("neighborhoods").includes(neighborhood.value)}
              onToggle={() => toggle("neighborhoods", neighborhood.value)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Estado del artículo">
          {CONDITIONS.map((condition) => (
            <FilterRow
              key={condition.value}
              label={condition.label}
              checked={read("conditions").includes(condition.value)}
              onToggle={() => toggle("conditions", condition.value)}
            />
          ))}
        </FilterGroup>
      </div>
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-rule pb-2 text-small font-bold text-ink">{title}</h2>
      <div className="mt-2 flex flex-col">{children}</div>
    </section>
  );
}

function FilterRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-4 shrink-0 cursor-pointer rounded-chip border-rule-strong accent-green"
      />
      <span className={cx("text-body", checked ? "font-medium text-ink" : "text-ink-2")}>{label}</span>
    </label>
  );
}

/** Resumen de lo que está filtrado, con la forma de sacar cada cosa. */
export function ActiveFilters({ total }: { total: number }) {
  const { read, toggle, clearAll, removeQuery, query } = useFilterUrl();

  const categories = read("categories");
  const neighborhoods = read("neighborhoods");
  const conditions = read("conditions");
  const any = Boolean(query) || categories.length + neighborhoods.length + conditions.length > 0;

  if (!any) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-4">
      <p className="mr-1 text-small text-ink-2">
        {total === 0
          ? "Sin resultados para"
          : `${total} ${total === 1 ? "artículo" : "artículos"} para`}
      </p>

      {query ? <RemovableChip onRemove={removeQuery}>{`“${query}”`}</RemovableChip> : null}

      {categories.map((value) => (
        <RemovableChip key={value} onRemove={() => toggle("categories", value)}>
          {categoryLabel(value)}
        </RemovableChip>
      ))}
      {neighborhoods.map((value) => (
        <RemovableChip key={value} onRemove={() => toggle("neighborhoods", value)}>
          {NEIGHBORHOODS.find((n) => n.value === value)?.label ?? value}
        </RemovableChip>
      ))}
      {conditions.map((value) => (
        <RemovableChip key={value} onRemove={() => toggle("conditions", value)}>
          {conditionLabel(value)}
        </RemovableChip>
      ))}

      <button
        type="button"
        onClick={clearAll}
        className="ml-auto cursor-pointer text-small font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
      >
        Ver todo
      </button>
    </div>
  );
}
