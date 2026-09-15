# Para seguir en otra conversación

Copiá y pegá el bloque de abajo como primer mensaje en un chat nuevo. Con eso el
asistente entiende el proyecto sin tener que leerlo entero.

---

## Mensaje para pegar

```text
Estoy trabajando en Mesira (https://mesira.net), un tablero solidario de la comunidad
judía argentina donde la gente regala cosas que ya no usa. Todo es gratis.

El código está en C:\Users\israe\Mesira\mesira-web

Es la versión 2, reescrita de cero en septiembre de 2026. Antes de tocar nada, leé estos
tres archivos, en este orden:

1. README.md      — arquitectura, modelo de datos, comandos
2. DESIGN.md      — la dirección visual y qué patrones este proyecto NO usa
3. SEGURIDAD.md   — por qué está hecho así; explica los agujeros de la versión vieja

Lo más importante que tenés que saber antes de escribir una línea:

- El navegador NUNCA escribe en Firestore ni en Storage. Toda mutación pasa por una ruta
  de /api que verifica la cookie de sesión y usa el Admin SDK. Por eso firestore.rules y
  storage.rules no tienen ni un solo `allow write`. Si vas a agregar una funcionalidad,
  seguí ese camino; no abras las reglas.
- La sesión es una cookie httpOnly de Firebase, no un token en una cabecera.
  getSessionUser() la resuelve en el servidor.
- Los permisos de administrador son un custom claim, no una lista de correos en el código.
- Toda entrada de una ruta se valida con Zod (src/lib/validation.ts) antes de tocar la base.
- Stack: Next.js 16 App Router, React 19, TypeScript estricto, Tailwind 4, Firebase.

Antes de dar por terminado cualquier cambio, corré `npm run check` (typecheck + lint).
Tiene que pasar limpio: desde Next 16, `next build` ya no corre ESLint solo.

Confirmame que leíste esos tres archivos antes de empezar.
```

---

## Dónde está cada cosa

Si te piden tocar… | Mirá primero
:--- | :---
El tablero, la búsqueda o los filtros | `src/app/page.tsx`, `src/components/feed/`
La ficha de un producto | `src/app/producto/[id]/page.tsx`, `src/components/product/`
Revelar un contacto | `src/app/api/products/[id]/contact/route.ts`, `src/lib/data/products.ts` (`revealContact`)
Publicar o editar | `src/components/product/ProductForm.tsx`, `src/app/api/products/`
Perfil, alertas, publicaciones propias | `src/app/mi-cuenta/page.tsx`, `src/components/account/`
Moderación | `src/app/admin/page.tsx`, `src/app/api/admin/`
Correos o notificaciones push | `src/lib/notify/`
Categorías, barrios, límites | `src/lib/constants.ts`
Colores, tipografía, espaciado | `src/app/globals.css` (y **leé DESIGN.md antes**)
Permisos de la base | `firestore.rules`, `storage.rules`

---

## Cosas que quedaron pendientes

Ninguna es urgente. Están ordenadas por lo que más valor aporta.

### 1. Paginación del tablero

Hoy `getFeed()` trae las últimas 400 publicaciones y filtra en memoria. Es más rápido y
mucho más robusto que armar un índice compuesto por cada combinación de filtros, y para el
volumen actual anda perfecto.

Cuando haya más de ~2000 publicaciones activas va a empezar a pesar. En ese momento hay
dos caminos: cursores de Firestore (`startAfter`) para el scroll, o mover la búsqueda a un
índice de texto externo (Algolia o Typesense) si lo que pesa es el buscador. El punto de
entrada es `src/lib/data/products.ts`, `FeedResult` ya devuelve `hasMore`.

### 2. Limpieza automática de publicaciones viejas

Las publicaciones cerradas dejan de mostrarse a las 48 horas y las activas a los 60 días,
pero los documentos y las fotos siguen en la base para siempre. Conviene una función
programada (Firebase Scheduled Function, o un cron de Vercel) que borre lo que pasó ese
plazo, junto con sus archivos de Storage.

### 3. La foto del donante

Se guarda `photoURL` de Google en la sesión pero no se muestra en ningún lado. Podría ir
en la ficha del producto, si te parece que suma confianza. Ojo con la privacidad: hoy solo
se muestra nombre e inicial del apellido a propósito.

### 4. Reactivación pedida por el usuario

La API ya soporta `request-reactivation` y el panel de moderación muestra el pedido, pero
no hay botón en la interfaz de "Mis publicaciones" para dispararlo. Falta solo el botón.

### 5. Vaciar el cache del tablero al publicar

`revalidatePath("/")` ya está en la ruta de creación. Si en algún momento el tablero tarda
en mostrar algo recién publicado, ahí está el lugar para mirar.

---

## Qué NO hacer

Cosas que parecen mejoras y no lo son. Cada una revierte algo que se arregló a propósito:

- **No abras las reglas de Firestore para "que el cliente lea más rápido".** El teléfono
  de la gente está a una regla de distancia de ser público.
- **No pongas un secreto en una variable `NEXT_PUBLIC_*`.** Todo lo que empieza así se
  incrusta en el JavaScript que descarga cualquier visitante.
- **No vuelvas a poner la lista de administradores en el código.** Está en un custom
  claim justamente para que no viaje al navegador.
- **No guardes imágenes en base64 dentro de Firestore.** Se probó, y hacía que cada carga
  del tablero bajara megabytes.
- **No juntes varias pantallas en un solo componente.** El archivo de 2.600 líneas de la
  versión anterior es de donde salieron la mitad de los bugs.
- **No agregues `userScalable: false` al viewport.** Impide agrandar el texto.
