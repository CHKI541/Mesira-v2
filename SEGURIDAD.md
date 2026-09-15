# Seguridad

Este documento tiene tres partes: lo que hay que hacer **ya** (rotar claves), qué estaba
mal en la versión anterior y cómo se arregló, y cómo está protegida esta versión.

---

## 1. Acciones urgentes

Estas no las puede hacer el código. Son tuyas, y conviene hacerlas antes de abrir el
proyecto nuevo al público.

### 1.1. El keystore de Android quedó en el historial de Git — CRÍTICO

En el repositorio viejo (`github.com/CHKI541/Mesira`) se commitearon y después se
quitaron estos dos archivos:

```
android/mesira-release.keystore      ← el certificado de firma de la app
android/keystore.properties          ← con la contraseña mesira2026
```

Quitarlos de la rama **no los saca del historial**: siguen siendo recuperables con
`git log --all` por cualquiera que tenga acceso al repositorio. Si el repo estuvo en
público, hay que asumir que la clave de firma está comprometida: con ella se puede
firmar un APK que Android acepte como una actualización legítima de Mesira.

**Qué hacer:**

1. Borrá el repositorio viejo (ya lo tenías planeado). Eso es lo que corta el acceso.
2. Si la app **todavía no está publicada en Google Play**: generá un keystore nuevo con
   una contraseña nueva y usá ese de ahora en adelante.
3. Si **ya está publicada**: no se puede cambiar el keystore de una app existente, salvo
   que tengas Play App Signing activado, en cuyo caso se pide un cambio de clave de carga
   desde Play Console. Revisalo antes de la próxima actualización.
4. El keystore nuevo **nunca** va dentro de la carpeta del repositorio. Guardalo aparte
   y hacé una copia en otro lado: si lo perdés, no podés volver a actualizar la app.

### 1.2. Claves que estuvieron en texto plano

Estas estaban escritas en `INICIO_NUEVA_CONVERSACION.md`, un archivo local que además se
pegó en conversaciones con asistentes de IA. Ese archivo estaba en `.gitignore`, así que
no llegó a GitHub, pero igual conviene rotarlas: una clave que pasó por varios lugares ya
no es una clave secreta.

| Qué | Dónde se rota |
| :--- | :--- |
| Clave privada de la cuenta de servicio de Firebase | Google Cloud Console → IAM → Cuentas de servicio → borrar la clave vieja, generar una nueva |
| API key de Resend | resend.com → API Keys → revocar y crear otra |
| Contraseña de aplicación de Gmail (`ucynckfqkwimgyho`) | myaccount.google.com → Seguridad → Contraseñas de aplicaciones → revocar. Esta versión no usa SMTP, así que se puede revocar y no reemplazar. |
| `ADMIN_API_SECRET`, `ALERT_NOTIFY_SECRET` | Ya no existen. Esta versión no los usa. |

La API key pública de Firebase (`NEXT_PUBLIC_FIREBASE_API_KEY`) **no** hace falta rotarla:
está diseñada para ser pública y viaja en el bundle de cualquier app de Firebase. Lo que
protege la base no es esa clave, son las reglas de Firestore y las rutas del servidor.

### 1.3. Restricciones recomendadas en la consola

- **Firebase Auth → Dominios autorizados:** dejá solo `mesira.net`, `www.mesira.net` y
  `localhost`. Sacá cualquier dominio de Vercel de preview que esté de más.
- **Google Cloud → Credenciales → la API key del navegador:** restringila por referente
  HTTP a `mesira.net/*`.
- **Firebase Storage:** verificá que las reglas desplegadas sean las de `storage.rules`
  de este repositorio. Si quedaron las viejas, cualquiera con una sesión puede escribir.

---

## 2. Qué estaba mal en la versión anterior

No es una lista para reprochar nada: es el registro de por qué esta versión está hecha
como está. Cada punto explica el problema y la decisión que lo reemplaza.

### 2.1. El secreto interno de las alertas viajaba al navegador

```env
NEXT_PUBLIC_ALERT_NOTIFY_SECRET="mesira-internal-2025-xK9mP7q"
```

Todo lo que empieza con `NEXT_PUBLIC_` se incrusta en el JavaScript que descarga
cualquier visitante. Ese "secreto" protegía `/api/alerts/notify`, la ruta que despacha
correos y notificaciones push a toda la base de usuarios. Cualquiera que abriera el
código fuente de la página podía leerlo y disparar envíos masivos.

**Ahora:** esa ruta no existe. El despacho es una función interna
(`src/lib/notify/dispatch.ts`) que llama el servidor después de crear una publicación.
No hay ninguna URL que la exponga.

### 2.2. Los datos de contacto se podían leer sin contactar a nadie

La lista de productos se leía directamente desde Firestore con el SDK del cliente, con
`allow read: if true`. Aunque la interfaz mostrara el teléfono recién después de apretar
un botón, el dato ya estaba en el navegador. Con la consola del navegador, o simplemente
consultando Firestore desde afuera, se podía descargar el teléfono de todos los donantes
de una sola vez.

**Ahora:** el teléfono vive en `products/{id}/private/contact`, una subcolección con
`allow read, write: if false`. Ningún cliente la puede leer, ni siquiera autenticado. La
única forma de obtener el dato es `POST /api/products/[id]/contact`, que exige sesión
válida, perfil completo, cupo de frecuencia disponible, y registra el contacto contra el
límite dentro de una transacción.

### 2.3. Cualquier usuario podía modificar publicaciones ajenas

Las reglas permitían a cualquier usuario autenticado escribir `contactCount`,
`isActive`, `contactedUserIds` y `deactivatedAt` en **cualquier** producto, no solo en
los propios. Con eso se podía desactivar la publicación de otra persona, o resetear su
contador para contactarla indefinidamente.

**Ahora:** el navegador no escribe en Firestore. Punto. Cada mutación pasa por una ruta
que verifica quién sos y si sos el dueño.

### 2.4. La lista de administradores estaba escrita en el código

```ts
["israel.chueke@gmail.com", "eli2626cohen@gmail.com"]
```

Repetida en nueve lugares, incluido `app/mi-cuenta/page.tsx`, que es un componente
cliente: los correos de los administradores quedaban visibles en el bundle. Agregar o
sacar un moderador requería editar el código y volver a desplegar.

**Ahora:** el permiso es un *custom claim* de Firebase Auth que se asigna con
`npm run admin:set -- correo@ejemplo.com`. No está en el código ni viaja al navegador, y
cambiarlo no requiere desplegar nada.

### 2.5. El panel de administración se "protegía" con estado de React

```ts
const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(true);
```

Inicializado en `true`. Eso no protege nada: es una variable del navegador que cualquiera
puede cambiar. Lo mismo con los botones de moderación que se mostraban `disabled` para
las cuentas de admin — bastaba con llamar a la API a mano para saltearlo.

**Ahora:** `/admin` llama a `requireAdmin()` en el servidor y devuelve un 404 si no lo
sos (ni siquiera revela que la página existe). Cada ruta `/api/admin/*` vuelve a
verificarlo, y hay reglas explícitas del lado del servidor: un admin no puede
deshabilitarse a sí mismo ni a otro admin.

### 2.6. Nada validaba lo que llegaba a la base

Las rutas hacían `await request.json()` y usaban los campos directamente. Un cliente
podía mandar un título de dos megabytes, un `maxContacts` de 999, o cualquier campo extra
que quedaba guardado en Firestore tal cual.

**Ahora:** cada ruta parsea su entrada con un esquema Zod (`src/lib/validation.ts`) antes
de tocar nada, con topes de longitud, listas cerradas de valores y normalización.

### 2.7. No había ningún límite de frecuencia

Una sola cuenta podía crear publicaciones o pedir contactos en bucle sin ningún freno.

**Ahora:** `src/lib/rate-limit.ts` limita por usuario y por acción, con los contadores en
Firestore (no en memoria, porque en Vercel cada pedido puede caer en otra instancia).

### 2.8. Las fotos se guardaban dentro de Firestore

Se comprimían a base64 y se metían en el documento del producto. Eso hacía que cada carga
del tablero bajara megabytes de imágenes incrustadas, que no se pudieran servir
optimizadas ni cacheadas, y que los documentos rozaran el límite de 1 MB de Firestore.

**Ahora:** van a Firebase Storage, subidas desde el servidor, que además verifica el tipo
real del archivo por su número mágico (que el data URL diga "image/jpeg" no significa que
lo sea).

### 2.9. La sesión vivía solo en el navegador

Cada llamada mandaba un ID token de Firebase en una cabecera. Un XSS se lo llevaba, y los
componentes de servidor no sabían quién era el usuario (de ahí el parpadeo de "no estás
logueado" en cada navegación).

**Ahora:** cookie de sesión de Firebase, `httpOnly` + `secure` + `sameSite=lax`. Ningún
script de la página la puede leer. Se verifica con `checkRevoked`, así que deshabilitar
una cuenta la expulsa de verdad en el próximo pedido.

### 2.10. Un archivo de 2.600 líneas

`app/mi-cuenta/page.tsx` tenía el perfil, las publicaciones, las alertas **y** el panel de
administración completo, todo en un componente. Eso no es solo incómodo: un archivo así
hace imposible revisar si una condición de permisos está bien puesta.

**Ahora:** `/mi-cuenta` y `/admin` son rutas separadas, cada sección es su propio
componente, y el archivo más largo del proyecto tiene menos de 400 líneas.

### 2.11. La página se podía dejar sin zoom

`viewport` tenía `userScalable: false`. Eso impide agrandar el texto, que para mucha gente
de la comunidad es la diferencia entre poder usar la página o no.

**Ahora:** no se restringe el zoom, y todo el texto pasa contraste AA en modo claro y
oscuro (verificado automáticamente, ver más abajo).

---

## 3. Cómo está protegida esta versión

### Autenticación y sesión

- Google como único proveedor; no manejamos contraseñas.
- Cookie de sesión `httpOnly`, `secure`, `sameSite=lax`, 5 días.
- Verificada con `checkRevoked: true` en cada pedido.
- Cerrar sesión revoca los refresh tokens del lado del servidor.
- Deshabilitar una cuenta la bloquea en Firebase Auth y revoca sus tokens.

### Autorización

| Acción | Quién puede |
| :--- | :--- |
| Ver el tablero y las fichas | Cualquiera, sin sesión |
| Ver un teléfono | Sesión + perfil completo + cupo disponible |
| Publicar | Sesión + perfil completo |
| Editar o borrar una publicación | Su dueño, o un administrador |
| Cambiar el estado de una publicación | Su dueño, o un administrador |
| Moderar | Solo custom claim `admin` |
| Deshabilitar una cuenta | Solo admin, y nunca a sí mismo ni a otro admin |

### Reglas de la base

`firestore.rules` y `storage.rules` no tienen ni un `allow write`. Entran en una pantalla
y se pueden auditar de un vistazo. Si alguna vez leés un `allow write` ahí, es un bug.

### Entrada

- Todo cuerpo de pedido pasa por un esquema Zod antes de tocar la base.
- Límite de tamaño del cuerpo, con 413 explícito.
- Caracteres de control y de ancho cero eliminados de todo texto.
- Las imágenes se verifican por número mágico, no por lo que declara el data URL.
- Todo lo que entra a un correo pasa por `escapeHtml`.

### Cabeceras

Definidas en `next.config.ts`: CSP, HSTS con preload, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` con cámara,
micrófono y geolocalización desactivados, y `poweredByHeader` apagado.

### Errores

Ninguna ruta devuelve el mensaje interno de un error inesperado. Se registra en el
servidor y al cliente le llega un texto genérico. Eso evita filtrar rutas de archivos,
nombres de colecciones o fragmentos de credenciales en un stack trace.

---

## 4. Verificaciones que corrí

| Qué | Resultado |
| :--- | :--- |
| `npm run check` (typecheck + lint, TS estricto) | Sin errores |
| `npm run build` | Compila |
| `npm audit --omit=dev` | 2 vulnerabilidades moderadas, ambas en `gaxios`, una dependencia transitiva de `firebase-admin`. No hay parche upstream todavía; no afectan el camino de autenticación. |
| Búsqueda de secretos en todo el repositorio | Ninguno |
| Rutas de `/api` sin verificación de sesión | Ninguna |
| Admin SDK importado desde componentes cliente | Ninguno (lo impide `server-only`) |
| Contraste AA en 5 páginas, modo claro y oscuro | 0 fallos (se encontraron y corrigieron 23) |

---

## 5. Mantenimiento

- **Cada tanto:** `npm audit --omit=dev` y `npm outdated`.
- **Antes de cada deploy:** `npm run check`.
- **Si cambiás las reglas:** `firebase deploy --only firestore:rules,storage:rules`.
- **Si sospechás que una clave se filtró:** rotala primero, investigá después.
