"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { KEHILOT, NEIGHBORHOODS } from "@/lib/constants";
import { displayPhone } from "@/lib/format";
import type { UserProfile } from "@/types";

/**
 * Datos del perfil.
 *
 * El teléfono se guarda normalizado a +54 desde el servidor, así que la persona
 * puede escribirlo como quiera — con 15, con guiones, con o sin característica — y
 * no recibe un error por el formato. Eso era una fuente constante de frustración en
 * el registro anterior.
 */
export function ProfileForm({ profile, email }: { profile: UserProfile | null; email: string }) {
  const router = useRouter();
  const toast = useToast();

  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [kehila, setKehila] = useState(profile?.kehila ?? "");
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incomplete = !profile?.firstName || !profile?.phone || !profile?.kehila;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          kehila: kehila.trim(),
          neighborhood: neighborhood || null,
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; data: UserProfile }
        | { ok: false; error: string };

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      setPhone(payload.data.phone);
      toast("Perfil guardado.");
      router.refresh();
    } catch {
      setError("No hay conexión. Probá de nuevo en un momento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-6" noValidate>
      {incomplete ? (
        <Notice tone="warning">
          Completá estos datos para poder publicar y para pedir el contacto de otras publicaciones.
        </Notice>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre" required>
          {(id) => (
            <TextInput
              id={id}
              value={firstName}
              maxLength={40}
              autoComplete="given-name"
              onChange={(event) => setFirstName(event.target.value)}
            />
          )}
        </Field>

        <Field label="Apellido" required hint="En el tablero se ve solo la inicial.">
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              value={lastName}
              maxLength={40}
              autoComplete="family-name"
              onChange={(event) => setLastName(event.target.value)}
            />
          )}
        </Field>
      </div>

      <Field
        label="Celular"
        required
        hint={
          profile?.phone
            ? `Guardado como ${displayPhone(profile.phone)}. Se lo damos solo a quien pide el contacto de algo tuyo.`
            : "Escribilo como quieras: con 15, con guiones o con característica. Lo ordenamos nosotros."
        }
      >
        {(id, describedBy) => (
          <TextInput
            id={id}
            type="tel"
            inputMode="tel"
            aria-describedby={describedBy}
            value={phone}
            maxLength={25}
            autoComplete="tel"
            placeholder="11 2345-6789"
            onChange={(event) => setPhone(event.target.value)}
          />
        )}
      </Field>

      <Field label="Kehilá" required hint="Elegí la tuya o escribila si no está en la lista.">
        {(id, describedBy) => (
          <>
            <TextInput
              id={id}
              aria-describedby={describedBy}
              list="kehilot"
              value={kehila}
              maxLength={60}
              onChange={(event) => setKehila(event.target.value)}
              placeholder="Jabad Lubavitch"
            />
            <datalist id="kehilot">
              {KEHILOT.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </>
        )}
      </Field>

      <Field label="Tu barrio" hint="Opcional. Sirve para mostrarte primero lo que está cerca.">
        {(id, describedBy) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={neighborhood}
            onChange={(event) => setNeighborhood(event.target.value)}
          >
            <option value="">Prefiero no decirlo</option>
            {NEIGHBORHOODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Correo de la cuenta" hint="Viene de tu cuenta de Google y no se puede cambiar acá.">
        {(id, describedBy) => (
          <TextInput id={id} aria-describedby={describedBy} value={email} disabled readOnly />
        )}
      </Field>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div>
        <Button type="submit" size="lg" loading={saving}>
          Guardar mi perfil
        </Button>
      </div>
    </form>
  );
}
