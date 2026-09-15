import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mesira.net";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nada de lo que hay detrás de una sesión tiene por qué estar indexado.
      disallow: ["/api/", "/mi-cuenta", "/admin", "/publicar"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
