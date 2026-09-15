"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Notice, StatusDot } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { neighborhoodLabel } from "@/lib/constants";
import { displayPhone, relativeTime, truncate } from "@/lib/format";
import type { Product, Report } from "@/types";
import type { AdminUserRow } from "@/lib/data/users";

/**
 * Tablas de moderación.
 *
 * Las tablas se envuelven en un contenedor con scroll horizontal propio en lugar de
 * encoger las columnas: una tabla apretada en un celular no se lee, y el resto de la
 * página no debe desplazarse de costado por culpa de ella.
 */

export function ReportsTable({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function resolve(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/admin/reports/${id}`, { method: "POST" });
      toast("Reporte marcado como revisado.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (reports.length === 0) {
    return <p className="py-8 text-body text-ink-2">No hay reportes pendientes.</p>;
  }

  return (
    <ul className="border-t border-rule">
      {reports.map((report) => (
        <li key={report.id} className="flex flex-wrap items-start gap-4 border-b border-rule py-4">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-ink">
              <Link
                href={`/producto/${report.productId}`}
                className="underline-offset-4 hover:underline"
              >
                {report.productTitle}
              </Link>
            </p>
            <p className="mt-0.5 text-small text-ink-2">
              {reasonLabel(report.reason)}, reportada {relativeTime(report.createdAt)} por{" "}
              {report.reporterEmail}
            </p>
            {report.detail ? (
              <p className="mt-2 font-serif text-prose leading-relaxed text-ink">{report.detail}</p>
            ) : null}
          </div>
          <Button size="sm" variant="secondary" loading={busy === report.id} onClick={() => void resolve(report.id)}>
            Marcar revisado
          </Button>
        </li>
      ))}
    </ul>
  );
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    "no-disponible": "Ya no está disponible",
    "venta-encubierta": "Venta encubierta",
    "contenido-inapropiado": "Contenido inapropiado",
    spam: "Spam",
    otro: "Otro motivo",
  };
  return map[reason] ?? reason;
}

export function ProductsTable({ products }: { products: Product[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? products.filter((p) =>
        `${p.title} ${p.ownerName}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : products;

  async function act(id: string, action: "remove" | "restore" | "reopen", message: string) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setError(payload.error ?? "No se pudo completar la acción.");
        return;
      }
      toast(message);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por título o por quien publicó"
        aria-label="Buscar publicaciones"
        className="mb-4 h-10 w-full max-w-sm rounded-card border border-rule-strong bg-surface px-3 text-body focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
      />

      {error ? (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-rule text-small text-ink-2">
              <th scope="col" className="py-2 pr-4 font-semibold">Publicación</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Quién</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Estado</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Contactos</th>
              <th scope="col" className="py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-b border-rule align-top">
                <td className="py-3 pr-4">
                  <Link
                    href={`/producto/${product.id}`}
                    className="text-body font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {truncate(product.title, 46)}
                  </Link>
                  <p className="mt-0.5 text-small text-ink-2">
                    {neighborhoodLabel(product.neighborhood, product.customNeighborhood)},{" "}
                    {relativeTime(product.createdAt)}
                  </p>
                </td>
                <td className="py-3 pr-4 text-small text-ink-2">{product.ownerName}</td>
                <td className="py-3 pr-4">
                  <StatusDot status={product.status} />
                  {product.reactivationRequested ? (
                    <p className="mt-1 text-small text-amber">Pidió reactivación</p>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-small text-ink-2 tabular-nums">
                  {product.contactCount} / {product.maxContacts}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {product.status === "removed" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy === product.id}
                        onClick={() => void act(product.id, "restore", "Publicación restaurada.")}
                      >
                        Restaurar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busy === product.id}
                        onClick={() => void act(product.id, "remove", "Publicación dada de baja.")}
                      >
                        Dar de baja
                      </Button>
                    )}
                    {product.status === "closed" || product.reactivationRequested ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy === product.id}
                        onClick={() => void act(product.id, "reopen", "Publicación reabierta.")}
                      >
                        Reabrir
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-body text-ink-2">No hay publicaciones que coincidan.</p>
      ) : null}
    </div>
  );
}

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? users.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email} ${u.kehila}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : users;

  async function toggle(uid: string, disabled: boolean) {
    setBusy(uid);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: disabled ? "enable" : "disable" }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setError(payload.error ?? "No se pudo cambiar el estado.");
        return;
      }
      toast(disabled ? "Cuenta habilitada." : "Cuenta deshabilitada.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre, correo o kehilá"
        aria-label="Buscar personas"
        className="mb-4 h-10 w-full max-w-sm rounded-card border border-rule-strong bg-surface px-3 text-body focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
      />

      {error ? (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-rule text-small text-ink-2">
              <th scope="col" className="py-2 pr-4 font-semibold">Persona</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Kehilá</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Celular</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Publicaciones</th>
              <th scope="col" className="py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.uid} className="border-b border-rule align-top">
                <td className="py-3 pr-4">
                  <p className="text-body font-medium text-ink">
                    {`${user.firstName} ${user.lastName}`.trim() || "Sin nombre"}
                  </p>
                  <p className="mt-0.5 text-small text-ink-2">{user.email}</p>
                  {user.disabled ? (
                    <p className="mt-0.5 text-small text-clay">Deshabilitada</p>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-small text-ink-2">{user.kehila || "No indicó"}</td>
                <td className="py-3 pr-4 text-small text-ink-2 tabular-nums">
                  {user.phone ? displayPhone(user.phone) : "Sin celular"}
                </td>
                <td className="py-3 pr-4 text-small text-ink-2 tabular-nums">{user.productCount}</td>
                <td className="py-3">
                  <Button
                    size="sm"
                    variant={user.disabled ? "secondary" : "danger"}
                    loading={busy === user.uid}
                    onClick={() => void toggle(user.uid, user.disabled)}
                  >
                    {user.disabled ? "Habilitar" : "Deshabilitar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-body text-ink-2">No hay personas que coincidan.</p>
      ) : null}
    </div>
  );
}
