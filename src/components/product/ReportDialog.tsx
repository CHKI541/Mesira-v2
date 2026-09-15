"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";

const REASONS = [
  { value: "no-disponible", label: "Ya no está disponible" },
  { value: "venta-encubierta", label: "En realidad lo están vendiendo" },
  { value: "contenido-inapropiado", label: "El contenido es inapropiado" },
  { value: "spam", label: "Es spam o publicidad" },
  { value: "otro", label: "Otro motivo" },
] as const;

/**
 * Reportar una publicación.
 *
 * Es una función que la versión anterior no tenía. En una plataforma abierta donde
 * la gente sube fotos y comparte su celular, no tener forma de avisar que algo está
 * mal es un problema de seguridad de las personas, no una comodidad que falta.
 */
export function ReportDialog({ productId, signedIn }: { productId: string; signedIn: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail: detail.trim() || null }),
      });
      const payload = (await response.json()) as
        | { ok: true; data: { alreadyReported: boolean } }
        | { ok: false; error: string };

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      setOpen(false);
      setDetail("");
      toast(
        payload.data.alreadyReported
          ? "Ya habías reportado esta publicación. La estamos revisando."
          : "Reporte enviado. Gracias por avisar.",
      );
    } catch {
      setError("No hay conexión. Probá de nuevo en un momento.");
    } finally {
      setSending(false);
    }
  }

  if (!signedIn) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer text-small text-ink-2 underline underline-offset-4 transition-colors hover:text-clay"
      >
        Reportar esta publicación
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Reportar publicación"
        description="Lo revisa una persona del equipo de moderación. No se le avisa a quien publicó quién reportó."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} loading={sending}>
              Enviar el reporte
            </Button>
          </>
        }
      >
        <fieldset className="flex flex-col gap-0.5">
          <legend className="mb-2 text-small font-semibold text-ink">¿Qué pasa con esta publicación?</legend>
          {REASONS.map((item) => (
            <label key={item.value} className="flex cursor-pointer items-center gap-2.5 py-1.5 select-none">
              <input
                type="radio"
                name="motivo"
                value={item.value}
                checked={reason === item.value}
                onChange={() => setReason(item.value)}
                className="size-4 cursor-pointer accent-green"
              />
              <span className="text-body text-ink">{item.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="mt-4">
          <Field label="Contanos algo más" hint="Opcional. Ayuda a resolverlo más rápido.">
            {(id, describedBy) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                value={detail}
                maxLength={500}
                onChange={(event) => setDetail(event.target.value)}
                placeholder="Por ejemplo: me pidió plata cuando lo contacté."
              />
            )}
          </Field>
        </div>

        {error ? (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
