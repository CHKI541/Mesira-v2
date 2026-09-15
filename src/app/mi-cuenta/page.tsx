import type { Metadata } from "next";
import Link from "next/link";

import { AlertsManager } from "@/components/account/AlertsManager";
import { MyListings } from "@/components/account/MyListings";
import { ProfileForm } from "@/components/account/ProfileForm";
import { SignInPrompt } from "@/components/layout/SignInPrompt";
import { getSessionUser } from "@/lib/auth/session";
import { getUserAlerts } from "@/lib/data/alerts";
import { getUserProducts } from "@/lib/data/products";
import { cx } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false },
};

const SECTIONS = [
  { id: "publicaciones", label: "Mis publicaciones" },
  { id: "alertas", label: "Avisos y alertas" },
  { id: "perfil", label: "Mi perfil" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser().catch(() => null);

  if (!user) {
    return (
      <SignInPrompt
        title="Entrá a tu cuenta"
        body="Acá administrás tus publicaciones, tus alertas y tus datos. Entrá con Google para verlo."
      />
    );
  }

  const params = await searchParams;
  const raw = Array.isArray(params.seccion) ? params.seccion[0] : params.seccion;
  const section: SectionId = SECTIONS.some((s) => s.id === raw)
    ? (raw as SectionId)
    : user.profileComplete
      ? "publicaciones"
      : "perfil";

  const [products, alerts] = await Promise.all([
    section === "publicaciones" ? getUserProducts(user.uid) : Promise.resolve([]),
    section === "alertas" ? getUserAlerts(user.uid) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
      <div className="py-6">
        <h1 className="text-display font-extrabold text-ink">Mi cuenta</h1>
        <p className="mt-1 text-body text-ink-2">{user.email}</p>
      </div>

      <nav aria-label="Secciones de la cuenta" className="scroll-rail scroll-rail-hide -mx-4 border-b border-rule px-4">
        <ul className="flex gap-1">
          {SECTIONS.map((item) => {
            const active = item.id === section;
            return (
              <li key={item.id}>
                <Link
                  href={`/mi-cuenta?seccion=${item.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "-mb-px inline-block whitespace-nowrap border-b-2 px-3 py-3 text-body font-medium transition-colors",
                    active
                      ? "border-ink text-ink"
                      : "border-transparent text-ink-2 hover:text-ink",
                  )}
                >
                  {item.label}
                  {item.id === "perfil" && !user.profileComplete ? (
                    <span
                      className="ml-1.5 inline-block size-1.5 rounded-dot bg-amber align-middle"
                      aria-label="Falta completar"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pt-8">
        {section === "publicaciones" ? <MyListings products={products} /> : null}
        {section === "alertas" ? <AlertsManager alerts={alerts} profile={user.profile} /> : null}
        {section === "perfil" ? <ProfileForm profile={user.profile} email={user.email} /> : null}
      </div>
    </div>
  );
}
