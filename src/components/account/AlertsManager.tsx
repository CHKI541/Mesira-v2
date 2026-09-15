"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput, Toggle } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { PushToggle } from "@/components/account/PushToggle";
import {
  CATEGORIES,
  MAX_ALERTS_PER_USER,
  NEIGHBORHOODS,
  categoryLabel,
} from "@/lib/constants";
import { cx } from "@/lib/format";
import type { Alert, UserProfile } from "@/types";

/**
 * Alertas y avisos.
 *
 * Dos cosas distintas que antes estaban mezcladas: *cuándo* querés que te avisemos
 * (todas las publicaciones, solo las que coinciden con tus alertas, o nada) y *por
 * dónde* (correo, push). Separarlas hace que la pregunta "¿por qué me llegan tantos
 * mails?" tenga una respuesta que la persona puede cambiar sola.
 */
export function AlertsManager({
  alerts,
  profile,
}: {
  alerts: Alert[];
  profile: UserProfile | null;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <NotificationPrefs profile={profile} />
      <AlertList alerts={alerts} />
    </div>
  );
}

function NotificationPrefs({ profile }: { profile: UserProfile | null }) {
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState(profile?.notifyMode ?? "alerts");
  const [byEmail, setByEmail] = useState(profile?.notifyByEmail ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { notifyMode?: typeof mode; notifyByEmail?: boolean }) {
    const body = {
      notifyMode: next.notifyMode ?? mode,
      notifyByEmail: next.notifyByEmail ?? byEmail,
      notifyByPush: profile?.notifyByPush ?? false,
    };

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setError(payload.error ?? "No se pudo guardar.");
        return;
      }
      toast("Preferencias guardadas.");
      router.refresh();
    } catch {
      setError("No hay conexión. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const options = [
    { value: "alerts", label: "Solo lo que coincide con mis alertas", hint: "Lo más habitual." },
    { value: "all", label: "Cada publicación nueva", hint: "Puede ser mucho correo." },
    { value: "none", label: "No quiero avisos", hint: "Entrás al tablero cuando quieras." },
  ] as const;

  return (
    <section>
      <h2 className="text-h2 font-bold text-ink">Cuándo te avisamos</h2>

      <fieldset className="mt-4 flex flex-col gap-0.5" disabled={saving}>
        <legend className="sr-only">Frecuencia de avisos</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              "flex cursor-pointer items-start gap-3 rounded-card border px-3.5 py-3 transition-colors",
              mode === option.value
                ? "border-green bg-green-soft"
                : "border-transparent hover:bg-surface-2",
            )}
          >
            <input
              type="radio"
              name="notifyMode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => {
                setMode(option.value);
                void save({ notifyMode: option.value });
              }}
              className="mt-0.5 size-4 cursor-pointer accent-green"
            />
            <span>
              <span className="block text-body font-medium text-ink">{option.label}</span>
              <span className="block text-small text-ink-2">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode !== "none" ? (
        <div className="mt-4 divide-y divide-rule border-y border-rule">
          <Toggle
            checked={byEmail}
            disabled={saving}
            onChange={(next) => {
              setByEmail(next);
              void save({ notifyByEmail: next });
            }}
            label="Por correo"
            description={profile?.email ?? "A tu correo de la cuenta"}
          />
          <PushToggle enabled={profile?.notifyByPush ?? false} />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </section>
  );
}

function AlertList({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const toast = useToast();

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const full = alerts.length >= MAX_ALERTS_PER_USER;

  async function create(event: React.FormEvent) {
    event.preventDefault();

    if (keyword.trim().length < 2 && !category && !neighborhood) {
      setError("Escribí una palabra o elegí al menos un filtro.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          categories: category ? [category] : [],
          neighborhoods: neighborhood ? [neighborhood] : [],
          conditions: [],
          channel: "both",
        }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setError(payload.error ?? "No se pudo crear la alerta.");
        return;
      }

      setKeyword("");
      setCategory("");
      setNeighborhood("");
      toast("Alerta creada. Te avisamos apenas aparezca algo así.");
      router.refresh();
    } catch {
      setError("No hay conexión. Probá de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    try {
      const response = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setError(payload.error ?? "No se pudo borrar la alerta.");
        return;
      }
      toast("Alerta borrada.");
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section>
      <h2 className="text-h2 font-bold text-ink">Qué estás buscando</h2>
      <p className="mt-1 font-serif text-prose leading-relaxed text-ink-2">
        Decinos qué necesitás y te avisamos apenas alguien lo publique, sin que tengas que entrar
        a mirar todos los días.
      </p>

      <form onSubmit={create} className="mt-5 flex flex-col gap-4" noValidate>
        <Field label="Palabra clave" hint="Por ejemplo: cuna, heladera, bicicleta, sidur.">
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              value={keyword}
              maxLength={40}
              disabled={full}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="cuna"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            {(id) => (
              <Select
                id={id}
                value={category}
                disabled={full}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Cualquiera</option>
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Barrio">
            {(id) => (
              <Select
                id={id}
                value={neighborhood}
                disabled={full}
                onChange={(event) => setNeighborhood(event.target.value)}
              >
                <option value="">Cualquiera</option>
                {NEIGHBORHOODS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {full ? (
          <Notice tone="warning">
            Llegaste al máximo de {MAX_ALERTS_PER_USER} alertas. Borrá alguna para crear otra.
          </Notice>
        ) : null}

        <div>
          <Button type="submit" loading={creating} disabled={full}>
            Crear la alerta
          </Button>
        </div>
      </form>

      {alerts.length > 0 ? (
        <ul className="mt-8 border-t border-rule">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex items-center justify-between gap-4 border-b border-rule py-3"
            >
              <div className="min-w-0">
                <p className="text-body font-medium text-ink">
                  {alert.keyword ? `“${alert.keyword}”` : "Cualquier artículo"}
                </p>
                <p className="mt-0.5 text-small text-ink-2">{describeAlert(alert)}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                loading={removing === alert.id}
                onClick={() => void remove(alert.id)}
              >
                Borrar
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function describeAlert(alert: Alert): string {
  const parts: string[] = [];
  if (alert.categories.length > 0) {
    parts.push(`en ${alert.categories.map(categoryLabel).join(" o ")}`);
  }
  if (alert.neighborhoods.length > 0) {
    const labels = alert.neighborhoods.map(
      (n) => NEIGHBORHOODS.find((item) => item.value === n)?.label ?? n,
    );
    parts.push(`de ${labels.join(" o ")}`);
  }
  return parts.length > 0 ? `Solo ${parts.join(", ")}` : "En cualquier categoría y barrio";
}
