"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { ImagePicker, type ExistingImage, type PickedImage } from "@/components/product/ImagePicker";
import {
  CATEGORIES,
  CONDITIONS,
  DEFAULT_MAX_CONTACTS,
  MAX_MAX_CONTACTS,
  MIN_MAX_CONTACTS,
  NEIGHBORHOODS,
} from "@/lib/constants";
import { cx } from "@/lib/format";
import type { Product } from "@/types";

/**
 * Formulario de publicación.
 *
 * Un solo formulario sirve para crear y para editar: la diferencia es qué endpoint
 * llama y si arranca con fotos existentes. Antes esto vivía duplicado en dos lugares
 * distintos de un archivo de 2600 líneas, y las dos copias se fueron separando.
 *
 * La validación real la hace el servidor con Zod. Acá solo se valida lo suficiente
 * para no hacer un viaje de red que va a fallar seguro.
 */
export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(product);

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categories, setCategories] = useState<string[]>(product?.categories ?? []);
  const [condition, setCondition] = useState<string>(product?.condition ?? "bueno");
  const [neighborhood, setNeighborhood] = useState<string>(product?.neighborhood ?? "once");
  const [customNeighborhood, setCustomNeighborhood] = useState(product?.customNeighborhood ?? "");
  const [maxContacts, setMaxContacts] = useState(product?.maxContacts ?? DEFAULT_MAX_CONTACTS);
  const [shareEmail, setShareEmail] = useState(false);

  const [existing, setExisting] = useState<ExistingImage[]>(
    product?.images.map((i) => ({ path: i.path, url: i.url })) ?? [],
  );
  const [images, setImages] = useState<PickedImage[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalImages = existing.length + images.length;

  function toggleCategory(value: string) {
    setCategories((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : prev.length >= 3
          ? prev
          : [...prev, value],
    );
  }

  function localCheck(): string | null {
    if (title.trim().length < 4) return "Escribí un título de al menos 4 caracteres.";
    if (description.trim().length < 10) return "Contá un poco más en la descripción.";
    if (categories.length === 0) return "Elegí al menos una categoría.";
    if (neighborhood === "otro" && !customNeighborhood.trim()) return "Escribí el nombre del barrio.";
    if (totalImages === 0) return "Subí al menos una foto.";
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const problem = localCheck();
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError(null);

    const common = {
      title: title.trim(),
      description: description.trim(),
      categories,
      condition,
      neighborhood,
      customNeighborhood: neighborhood === "otro" ? customNeighborhood.trim() : null,
      maxContacts,
      preferWhatsapp: true,
      shareEmail,
    };

    const body = editing
      ? {
          ...common,
          keepImagePaths: existing.map((i) => i.path),
          newImages: images.map(({ dataUrl, width, height }) => ({ dataUrl, width, height })),
        }
      : {
          ...common,
          images: images.map(({ dataUrl, width, height }) => ({ dataUrl, width, height })),
        };

    try {
      const response = await fetch(editing ? `/api/products/${product!.id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as
        | { ok: true; data: { id: string } }
        | { ok: false; error: string };

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      toast(editing ? "Cambios guardados." : "Publicada. Ya está en el tablero.");
      router.push(`/producto/${payload.data.id}`);
      router.refresh();
    } catch {
      setError("No hay conexión. Revisá tu internet y probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-7" noValidate>
      <ImagePicker
        existing={editing ? existing : undefined}
        onExistingChange={setExisting}
        images={images}
        onChange={setImages}
      />

      <Field label="¿Qué estás regalando?" required hint="Un título corto y claro. Ejemplo: Cuna de madera con colchón.">
        {(id, describedBy) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Cuna de madera con colchón"
            autoComplete="off"
          />
        )}
      </Field>

      <Field
        label="Contá cómo está"
        required
        hint="Marcas de uso, medidas, si falta alguna pieza, desde cuándo lo tenés. Cuanto más claro, menos preguntas después."
      >
        {(id, describedBy) => (
          <TextArea
            id={id}
            aria-describedby={describedBy}
            value={description}
            maxLength={1500}
            rows={6}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="La usamos dos años, está firme y completa. Tiene una marca chica en un costado que se ve en la tercera foto. Se retira por Once."
          />
        )}
      </Field>

      <fieldset>
        <legend className="text-small font-semibold text-ink">
          Categoría <span className="text-clay">*</span>
        </legend>
        <p className="mt-0.5 text-small text-ink-2">Hasta 3, para que lo encuentren más fácil.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const active = categories.includes(category.value);
            const blocked = !active && categories.length >= 3;
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => toggleCategory(category.value)}
                aria-pressed={active}
                disabled={blocked}
                className={cx(
                  "h-9 rounded-chip border px-3 text-small font-medium transition-colors",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule-strong bg-surface text-ink-2 hover:border-ink-2 hover:text-ink",
                  blocked && "cursor-not-allowed opacity-40",
                  !blocked && "cursor-pointer",
                )}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Estado del artículo" required>
          {(id) => (
            <Select id={id} value={condition} onChange={(event) => setCondition(event.target.value)}>
              {CONDITIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} — {item.hint}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="¿Dónde se retira?" required>
          {(id) => (
            <Select
              id={id}
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
            >
              {NEIGHBORHOODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {neighborhood === "otro" ? (
        <Field label="¿Qué barrio?" required>
          {(id) => (
            <TextInput
              id={id}
              value={customNeighborhood}
              maxLength={60}
              onChange={(event) => setCustomNeighborhood(event.target.value)}
              placeholder="Villa Devoto"
            />
          )}
        </Field>
      ) : null}

      <Field
        label="¿Cuántas personas pueden pedirte el contacto?"
        hint="Al llegar a ese número la publicación se cierra sola, así no te siguen escribiendo después de que ya lo entregaste. Podés reabrirla cuando quieras."
      >
        {(id) => (
          <Select
            id={id}
            value={String(maxContacts)}
            onChange={(event) => setMaxContacts(Number(event.target.value))}
            className="sm:max-w-52"
          >
            {Array.from({ length: MAX_MAX_CONTACTS - MIN_MAX_CONTACTS + 1 }, (_, i) => {
              const value = MIN_MAX_CONTACTS + i;
              return (
                <option key={value} value={value}>
                  {value} {value === 1 ? "persona" : "personas"}
                </option>
              );
            })}
          </Select>
        )}
      </Field>

      {!editing ? (
        <div className="rounded-card border border-rule bg-surface-2 p-4">
          <p className="text-small font-semibold text-ink">Qué van a ver de vos</p>
          <p className="mt-1 font-serif text-prose leading-relaxed text-ink-2">
            En el tablero aparece tu nombre y la inicial de tu apellido. Tu celular se lo damos
            únicamente a quien pide el contacto, y te avisamos por correo cada vez que pasa.
          </p>
          <div className="mt-2">
            <Checkbox
              checked={shareEmail}
              onChange={(event) => setShareEmail(event.target.checked)}
              label="Compartir también mi email"
              description="Útil si preferís que te escriban por correo en vez de WhatsApp."
            />
          </div>
        </div>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex flex-col gap-3 border-t border-rule pt-6 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" size="lg" loading={saving}>
          {editing ? "Guardar los cambios" : "Publicar la mitzvá"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
