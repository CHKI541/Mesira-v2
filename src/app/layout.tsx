import type { Metadata, Viewport } from "next";
import { Archivo, Source_Serif_4 } from "next/font/google";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { getSessionUser } from "@/lib/auth/session";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/layout/ServiceWorker";

import "./globals.css";

/**
 * Dos familias con roles distintos: Archivo es la voz del sistema, Source Serif es
 * la voz de una persona. Ver DESIGN.md. next/font las auto-hospeda, así que no hay
 * un pedido a Google en tiempo de carga ni salto de tipografía.
 */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["400", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mesira.net";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mesira — Regalá lo que ya no usás",
    template: "%s · Mesira",
  },
  description:
    "Tablero solidario de la comunidad judía argentina. Publicá gratis lo que ya no usás y encontralo quien lo necesita. Sin precios y sin intermediarios.",
  applicationName: "Mesira",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mesira",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "Mesira",
    title: "Mesira — Regalá lo que ya no usás",
    description:
      "Tablero solidario de la comunidad judía argentina. Publicá gratis lo que ya no usás y encontralo quien lo necesita.",
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Sin maximumScale ni userScalable:false — eso impide hacer zoom y rompe
  // la accesibilidad para quien necesita agrandar el texto.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1513" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // El usuario se resuelve en el servidor a partir de la cookie, así que el HTML
  // ya llega con la sesión correcta. Nada de parpadeos ni "cargando sesión".
  const user = await getSessionUser().catch(() => null);

  return (
    <html lang="es-AR" className={`${archivo.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <AuthProvider initialUser={user}>
          <ToastProvider>
            <a
              href="#contenido"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:border focus:border-rule-strong focus:bg-surface focus:px-4 focus:py-2 focus:text-body focus:font-semibold"
            >
              Saltar al contenido
            </a>

            <SiteHeader user={user} />

            <main id="contenido" className="flex-1">
              {children}
            </main>

            <SiteFooter />
            <ServiceWorker />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
