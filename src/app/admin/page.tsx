import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductsTable, ReportsTable, UsersTable } from "@/components/admin/AdminTables";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb, COLLECTIONS } from "@/lib/firebase/admin";
import { listUsersForAdmin } from "@/lib/data/users";
import { countAlerts } from "@/lib/data/alerts";
import { toMillis, cx } from "@/lib/format";
import type { Product, Report } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderación",
  robots: { index: false, follow: false },
};

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "reportes", label: "Reportes" },
  { id: "publicaciones", label: "Publicaciones" },
  { id: "personas", label: "Personas" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser().catch(() => null);

  // Un no-administrador ni siquiera se entera de que esta página existe.
  if (!user?.isAdmin) notFound();

  const params = await searchParams;
  const raw = Array.isArray(params.vista) ? params.vista[0] : params.vista;
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "resumen";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <div className="py-6">
        <h1 className="text-display font-extrabold text-ink">Moderación</h1>
        <p className="mt-1 text-body text-ink-2">Entraste como {user.email}.</p>
      </div>

      <nav aria-label="Vistas de moderación" className="scroll-rail scroll-rail-hide -mx-4 border-b border-rule px-4">
        <ul className="flex gap-1">
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <li key={item.id}>
                <Link
                  href={`/admin?vista=${item.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "-mb-px inline-block whitespace-nowrap border-b-2 px-3 py-3 text-body font-medium transition-colors",
                    active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pt-8">
        {tab === "resumen" ? <Summary /> : null}
        {tab === "reportes" ? <Reports /> : null}
        {tab === "publicaciones" ? <Products /> : null}
        {tab === "personas" ? <Users /> : null}
      </div>
    </div>
  );
}

async function Summary() {
  const db = adminDb();
  const [available, closed, delivered, removed, users, alerts, pendingReports] = await Promise.all([
    db.collection(COLLECTIONS.products).where("status", "==", "available").count().get(),
    db.collection(COLLECTIONS.products).where("status", "==", "closed").count().get(),
    db.collection(COLLECTIONS.products).where("status", "==", "delivered").count().get(),
    db.collection(COLLECTIONS.products).where("status", "==", "removed").count().get(),
    db.collection(COLLECTIONS.users).count().get(),
    countAlerts(),
    db.collection(COLLECTIONS.reports).where("resolved", "==", false).count().get(),
  ]);

  const rows: Array<[string, number]> = [
    ["Publicaciones disponibles", available.data().count],
    ["Cerradas", closed.data().count],
    ["Entregadas", delivered.data().count],
    ["Dadas de baja", removed.data().count],
    ["Personas registradas", users.data().count],
    ["Alertas activas", alerts],
    ["Reportes sin revisar", pendingReports.data().count],
  ];

  return (
    <dl className="max-w-md border-t border-rule">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between border-b border-rule py-3">
          <dt className="text-body text-ink-2">{label}</dt>
          <dd className="text-h2 font-bold text-ink tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

async function Reports() {
  const snap = await adminDb()
    .collection(COLLECTIONS.reports)
    .where("resolved", "==", false)
    .limit(200)
    .get();

  const reports: Report[] = snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        productId: String(data.productId ?? ""),
        productTitle: String(data.productTitle ?? "Sin título"),
        reporterId: String(data.reporterId ?? ""),
        reporterEmail: String(data.reporterEmail ?? ""),
        reason: String(data.reason ?? "otro"),
        detail: data.detail ? String(data.detail) : null,
        resolved: false,
        createdAt: toMillis(data.createdAt),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return <ReportsTable reports={reports} />;
}

async function Products() {
  const snap = await adminDb()
    .collection(COLLECTIONS.products)
    .orderBy("createdAt", "desc")
    .limit(300)
    .get();

  const products = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      categories: Array.isArray(data.categories) ? data.categories : [],
      condition: data.condition ?? "bueno",
      neighborhood: data.neighborhood ?? "otro",
      customNeighborhood: data.customNeighborhood ?? null,
      images: Array.isArray(data.images) ? data.images : [],
      status: data.status ?? "available",
      ownerId: String(data.ownerId ?? ""),
      ownerName: String(data.ownerName ?? ""),
      ownerKehila: data.ownerKehila ?? null,
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
      closedAt: data.closedAt ? toMillis(data.closedAt) : null,
      maxContacts: Number(data.maxContacts ?? 3),
      contactCount: Number(data.contactCount ?? 0),
      viewCount: Number(data.viewCount ?? 0),
      reactivationRequested: data.reactivationRequested === true,
    } as Product;
  });

  return <ProductsTable products={products} />;
}

async function Users() {
  const users = await listUsersForAdmin();
  return <UsersTable users={users} />;
}
