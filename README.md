# Mesira

Tablero solidario de la comunidad judía argentina: gente que regala cosas que ya no usa,
gente que las necesita. Sin precios, sin comisiones, sin intermediarios.

**Producción:** https://mesira.net

Esta es la versión 2, reescrita de cero. La versión anterior está archivada; en
[SEGURIDAD.md](./SEGURIDAD.md) están documentados los problemas que tenía y cómo se
resolvieron.

---

## Cómo está armado

| Capa | Qué se usa |
| :--- | :--- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript estricto |
| Estilos | Tailwind CSS 4, con los tokens definidos en `src/app/globals.css` |
| Autenticación | Firebase Auth (Google) + cookie de sesión httpOnly |
| Base de datos | Cloud Firestore, accedida **solo** desde el servidor |
| Archivos | Firebase Storage, escrito **solo** desde el servidor |
| Correo | Resend (API HTTP) |
| Push | Firebase Cloud Messaging |
| Hosting | Vercel |

### La decisión de arquitectura más importante

**El navegador nunca escribe en Firestore ni en Storage.** Todo pasa por una ruta de
`/api` que verifica la cookie de sesión y usa el Admin SDK.

Por eso `firestore.rules` y `storage.rules` son cortos y no tienen ni un solo
`allow write`. Es lo que hace que la superficie de ataque quepa en una pantalla.

---

## Estructura

```
src/
├── app/
│   ├── page.tsx                   El tablero
│   ├── producto/[id]/             Ficha, y su edición
│   ├── publicar/                  Formulario de publicación
│   ├── mi-cuenta/                 Perfil, publicaciones propias, alertas
│   ├── admin/                     Panel de moderación
│   ├── ayuda|terminos|privacidad/ Páginas de contenido
│   └── api/                       Todas las mutaciones viven acá
├── components/
│   ├── ui/                        Botón, campos, diálogo, avisos
│   ├── layout/                    Encabezado, pie, logo, service worker
│   ├── feed/                      Tarjeta y filtros del tablero
│   ├── product/                   Galería, panel de contacto, formulario
│   ├── account/                   Perfil, publicaciones, alertas, push
│   └── admin/                     Tablas de moderación
├── lib/
│   ├── auth/                      Cookie de sesión y contexto de cliente
│   ├── data/                      Único punto de acceso a Firestore
│   ├── firebase/                  SDK cliente y Admin
│   ├── notify/                    Correo, push, y el despachador
│   ├── constants.ts               Categorías, barrios, reglas de negocio
│   ├── validation.ts              Esquemas Zod de toda entrada
│   ├── rate-limit.ts              Límites por usuario y acción
│   └── images.ts                  Subida y validación de fotos
└── types/                         Formas de los datos
```

---

## Correr el proyecto

```bash
npm install
cp .env.example .env.local     # y completá los valores
npm run dev                    # http://localhost:3000
```

| Comando | Qué hace |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm run check` | Typecheck + lint. **Corré esto antes de cada deploy.** |
| `npm run admin:set -- correo@ejemplo.com` | Convierte a alguien en moderador |
| `npm run db:wipe-products` | Vacía el tablero conservando las cuentas |

Desde Next 16, `next build` ya no ejecuta ESLint por su cuenta: por eso existe
`npm run check`.

---

## Modelo de datos

```
users/{uid}
  email, firstName, lastName, phone, kehila, neighborhood
  notifyMode ("all" | "alerts" | "none"), notifyByEmail, notifyByPush
  fcmTokens[], disabled, createdAt, updatedAt

products/{id}
  title, description, categories[], condition, neighborhood, customNeighborhood
  images[{ url, path, width, height }]
  status ("available" | "closed" | "delivered" | "removed")
  ownerId, ownerName, ownerKehila
  maxContacts, contactCount, contactedUserIds[], viewCount, viewedUserIds[]
  createdAt, updatedAt, closedAt, reactivationRequested

  products/{id}/private/contact      ← inaccesible desde cualquier cliente
    phone, email, preferWhatsapp

alerts/{id}
  userId, keyword, categories[], neighborhoods[], conditions[], channel, createdAt

reports/{id}
  productId, productTitle, reporterId, reporterEmail, reason, detail
  resolved, createdAt

rateLimits/{action__uid}
  windowStart, count
```

Dos cosas que cambiaron respecto de la versión anterior y conviene tener presentes:

1. **Un solo campo de estado.** Antes había `isActive`, `isDelivered` y `deactivatedAt`
   conviviendo, y se contradecían entre sí. Ahora es `status`, con cuatro valores.
2. **Las fotos van a Storage.** Antes se guardaban como base64 adentro del documento de
   Firestore, lo que hacía que cada carga del tablero bajara megabytes de imágenes y que
   los documentos rozaran el límite de 1 MB.

---

## El ciclo de vida de una publicación

```
             publicar
                ↓
         ┌─────────────┐   llega al límite de contactos
         │  available  │ ──────────────────────────────→ ┌────────┐
         │             │        o la pausa el dueño       │ closed │
         └─────────────┘ ←────────────────────────────── └────────┘
                │              "Volver a publicar"            │
                │            (contador y fecha a cero)         │
                │                                              │
                │ "Ya la entregué"                             │ a las 48 h
                ↓                                              │ sale del tablero
         ┌─────────────┐                                       │
         │  delivered  │                                       ↓
         └─────────────┘                          (sigue visible en Mi cuenta)

    La moderación puede mandar cualquiera a `removed`, que la saca del
    tablero para todos menos para su dueño y los administradores.
```

---

## Diseño

La dirección visual y su justificación están en [DESIGN.md](./DESIGN.md), escrito antes
del código siguiendo la skill oficial `frontend-design` de Anthropic. Si vas a agregar
una pantalla, leelo primero: define la paleta, la tipografía, el uso del color como
información, y una lista explícita de patrones que este proyecto no usa.
