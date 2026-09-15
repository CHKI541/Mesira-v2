import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad aplicadas a todas las respuestas.
 *
 * La CSP está escrita a mano en lugar de generarse con nonces porque la app no inyecta
 * scripts en línea: Next sirve sus bundles desde el mismo origen. 'unsafe-inline' queda
 * solo en style-src, que es lo que necesita el runtime de Next para sus estilos críticos.
 */
const CSP = [
  "default-src 'self'",
  // Firebase Auth y FCM cargan sus SDK y el iframe de login desde estos orígenes.
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://www.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "https://*.cloudfunctions.net",
    "https://firebaseinstallations.googleapis.com",
    "https://fcmregistrations.googleapis.com",
    "wss://*.firebaseio.com",
  ].join(" "),
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Un error de tipos tiene que romper el deploy, no colarse a producción.
  // (Next 16 ya no corre ESLint dentro de `next build`: eso lo hace `npm run check`,
  // que es lo que debe ejecutarse en CI antes de desplegar.)
  typescript: { ignoreBuildErrors: false },

  // No anunciar la versión del framework.
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // El service worker no se puede cachear o los usuarios quedan clavados en una versión vieja.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/firebase-messaging-sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;
