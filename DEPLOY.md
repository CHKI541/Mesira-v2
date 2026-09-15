# Puesta en producción

Pasos en orden. Cada uno dice si lo podés hacer vos o si necesita la consola de algún
servicio. Calculá una hora la primera vez.

---

## 1. Subir el código a GitHub

El proyecto ya tiene `git` inicializado y el primer commit hecho, pero **sin remoto**:
eso lo elegís vos.

1. Entrá a https://github.com/new
2. Nombre sugerido: `mesira` (o `mesira-web`). Ponelo **privado**.
3. **No** marques "Add a README", "Add .gitignore" ni "Choose a license". El repositorio
   tiene que quedar vacío o el primer push va a chocar.
4. Desde la carpeta del proyecto:

```powershell
cd C:\Users\israe\Mesira\mesira-web
git remote add origin https://github.com/CHKI541/mesira.git
git branch -M main
git push -u origin main
```

Antes de apretar enter, una última verificación de que no se escapa ningún secreto:

```powershell
git ls-files | Select-String -Pattern "env|keystore|service.?account|credencial"
```

Tiene que devolver **solamente** `.env.example`. Si aparece cualquier otra cosa, pará y
revisá `.gitignore`.

### El repositorio viejo

Recién **después** de que el nuevo esté funcionando en producción, borrá
`github.com/CHKI541/Mesira`:

Settings → abajo de todo → Danger Zone → Delete this repository.

Es lo que corta el acceso al keystore que quedó en su historial (ver SEGURIDAD.md § 1.1).

---

## 2. Firebase

Se usa el proyecto que ya existe: `mesira-argentina`. Las cuentas de los usuarios se
conservan.

### 2.1. Generar una cuenta de servicio nueva

Consola de Firebase → Configuración del proyecto → Cuentas de servicio →
**Generar nueva clave privada**. Descarga un `.json`.

Guardalo **fuera** de la carpeta del repositorio. Después borrá la clave vieja desde
Google Cloud Console → IAM → Cuentas de servicio → la de `firebase-adminsdk` → Claves.

### 2.2. Desplegar las reglas

```powershell
npm install -g firebase-tools
firebase login
cd C:\Users\israe\Mesira\mesira-web
firebase use mesira-argentina
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

Este paso **no es opcional**. Si quedan las reglas viejas, el cliente sigue pudiendo
escribir en Firestore y la mitad de lo que se arregló no sirve de nada.

### 2.3. Verificar los dominios autorizados

Authentication → Settings → Authorized domains. Que estén `mesira.net`,
`www.mesira.net` y `localhost`, y nada más.

---

## 3. Variables de entorno en Vercel

Vercel → el proyecto → Settings → Environment Variables. Cargá cada una en
**Production, Preview y Development**.

| Variable | De dónde sale |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase → Configuración → Tus apps → Web |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `mesira-argentina.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mesira-argentina` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `mesira-argentina.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase → Configuración |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase → Configuración |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase → Cloud Messaging → Certificados push web |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | El `.json` del paso 2.1, **entero y en una sola línea** |
| `ADMIN_EMAILS` | Tu correo, separando por coma si son varios |
| `RESEND_API_KEY` | resend.com → API Keys (generá una nueva) |
| `EMAIL_FROM` | `Mesira <alertas@mesira.net>` |
| `EMAIL_REPLY_TO` | `soporte@mesira.net` |
| `NEXT_PUBLIC_SITE_URL` | `https://mesira.net` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `soporte@mesira.net` |

Para pasar el JSON a una sola línea, en PowerShell:

```powershell
(Get-Content "C:\ruta\al\service-account.json" -Raw) -replace "`r`n","" -replace "`n","" | Set-Clipboard
```

Y pegás con Ctrl+V en el campo de Vercel.

---

## 4. El service worker de las notificaciones

`public/firebase-messaging-sw.js` tiene valores de reemplazo. Un service worker no puede
leer las variables de entorno del bundle, así que hay que escribirlos a mano una vez:

```js
firebase.initializeApp({
  apiKey: "AIza...",                              // el mismo NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "mesira-argentina.firebaseapp.com",
  projectId: "mesira-argentina",
  storageBucket: "mesira-argentina.firebasestorage.app",
  messagingSenderId: "678...",
  appId: "1:678...:web:...",
});
```

Son las claves públicas de Firebase, así que no hay problema en que estén en el archivo.

---

## 5. Primer deploy

```powershell
cd C:\Users\israe\Mesira\mesira-web
npm run check      # tiene que pasar limpio
git push
```

Vercel despliega solo al detectar el push. Si el proyecto de Vercel todavía apunta al
repositorio viejo: Settings → Git → Disconnect, y conectá el nuevo.

---

## 6. Convertirte en administrador

El panel de moderación pide el custom claim `admin`, que no existe todavía.

1. Entrá a `https://mesira.net` con Google al menos una vez (crea tu cuenta).
2. En tu PC, con `.env.local` completo:

```powershell
cd C:\Users\israe\Mesira\mesira-web
npm run admin:set -- tu-correo@gmail.com
```

3. Cerrá sesión en el sitio y volvé a entrar. Ya te aparece "Moderación" en el menú.

Repetilo para cada moderador. `--quitar` al final saca el permiso.

---

## 7. Vaciar el tablero

Decidiste conservar las cuentas y arrancar el tablero limpio. Las publicaciones viejas
además usan un esquema distinto (fotos en base64, `isActive` en lugar de `status`), así
que no se verían bien en la interfaz nueva.

```powershell
cd C:\Users\israe\Mesira\mesira-web
npm run db:wipe-products                  # simula: muestra qué borraría
npm run db:wipe-products -- --si-borrar   # borra de verdad, pide confirmación
```

Antes, si querés red de seguridad:

```powershell
gcloud firestore export gs://mesira-argentina.firebasestorage.app/backup-2026-09-15
```

---

## 8. Probar antes de contarle a nadie

Con una cuenta de prueba, en el celular y en la computadora:

- [ ] Entrar con Google
- [ ] Completar el perfil (probá el teléfono con 15, con guiones, con +54)
- [ ] Publicar con 3 fotos desde el celular
- [ ] Que llegue el correo de alerta a otra cuenta que tenga una alerta que coincida
- [ ] Pedir el contacto desde una segunda cuenta
- [ ] Que el botón de WhatsApp abra el chat con el mensaje escrito
- [ ] Que al donante le llegue el correo de "alguien pidió tu contacto"
- [ ] Que al llegar al límite de contactos la publicación se cierre sola
- [ ] Marcar como entregada, y volver a publicar
- [ ] Reportar una publicación, y verla en el panel de moderación
- [ ] Editar y borrar una publicación
- [ ] Activar las notificaciones push y recibir una
- [ ] Instalar la PWA ("Agregar a la pantalla de inicio")
- [ ] Abrir `/admin` desde una cuenta que no sea admin → tiene que dar 404

---

## 9. La app de Android

La app es un contenedor de Capacitor que carga `https://mesira.net`, así que **se
actualiza sola** cuando desplegás la web: el APK que ya está instalado va a mostrar la
versión nueva sin recompilar nada.

Solo hace falta recompilar si cambia algo nativo (permisos, ícono, versión). Los pasos
están en `PARA_ANTIGRAVITY.md`, porque las herramientas están en tu disco D y yo no
puedo alcanzarlas desde acá.

---

## Si algo falla

| Síntoma | Causa más probable |
| :--- | :--- |
| "Falta FIREBASE_SERVICE_ACCOUNT_KEY" | La variable no está en Vercel, o el JSON quedó cortado en varias líneas |
| "Missing or insufficient permissions" | No desplegaste las reglas (paso 2.2) |
| "The query requires an index" | No desplegaste los índices (paso 2.2) |
| El login abre y cierra sin entrar | El dominio no está en Authorized domains (paso 2.3) |
| No llegan los correos | `RESEND_API_KEY` mal, o el dominio `mesira.net` sin verificar en Resend |
| No llegan las push | El service worker con los valores de reemplazo (paso 4), o falta `NEXT_PUBLIC_FIREBASE_VAPID_KEY` |
| `/admin` da 404 siendo admin | Te falta cerrar sesión y volver a entrar después de `admin:set` |
