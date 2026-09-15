import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mesira.net";

/**
 * Solo las páginas estables. Las publicaciones individuales no van al sitemap:
 * duran días, y un índice lleno de enlaces muertos es peor que no tener índice.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: siteUrl, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/ayuda`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
