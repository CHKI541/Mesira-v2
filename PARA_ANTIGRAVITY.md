# Tareas para Antigravity

Estas son las cosas que **no pude hacer yo** y por qué. Cada una está escrita para que se
pueda ejecutar sin tener que reconstruir el contexto del proyecto.

Yo corro en un contenedor en la nube, conectado a la carpeta `C:\Users\israe\Mesira`.
No alcanzo el disco D, no puedo compilar Android, no puedo abrir consolas web con tu
sesión, y no tengo tus credenciales (a propósito).

---

## Tarea 1 — Recompilar el APK de Android

**Por qué no lo hago yo:** el JDK y el Android SDK están en tu disco D, fuera de las
carpetas a las que tengo acceso.

**¿Hace falta?** Probablemente no todavía. La app es un contenedor de Capacitor que carga
`https://mesira.net` en un WebView: cuando se despliegue la web nueva, **el APK que ya
está instalado va a mostrar la versión nueva sin recompilar nada**.

Solo hace falta recompilar si cambia algo nativo: el ícono, el nombre, los permisos, el
`versionCode`, o si hay que subir una versión nueva a Google Play.

### Pasos

```powershell
# 1. Sincronizar los assets web con el proyecto nativo
cd C:\Users\israe\Mesira\app
npm run build
npx cap sync android

# 2. Variables de entorno de las herramientas del disco D
$env:JAVA_HOME="D:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME="D:\Users\Administrator\AppData\Local\Android\Sdk"

# 3. Compilar firmado
cd android
.\gradlew.bat assembleRelease
```

El APK queda en `android\app\build\outputs\apk\release\app-release.apk`.

### Antes de compilar, verificá

- [ ] `android/app/src/main/AndroidManifest.xml` **no** tiene `android:debuggable="true"`
      ni `android:usesCleartextTraffic="true"` (los dos hacen que Play Store rechace la subida)
- [ ] `capacitor.config.json` apunta a `https://mesira.net`
- [ ] `android/keystore.properties` existe y apunta al keystore correcto
- [ ] `android/app/src/main/res/values/strings.xml` tiene el `server_client_id` correcto
      (el Web Client ID de Firebase; si no coincide, el login con Google falla al instante)
- [ ] Subiste el `versionCode` en `android/app/build.gradle` si vas a publicar en Play

### Importante sobre el keystore

El keystore viejo y su contraseña quedaron en el historial del repositorio
`github.com/CHKI541/Mesira`. Leé `SEGURIDAD.md` § 1.1 antes de decidir si generar uno
nuevo. Resumen:

- Si la app **no** está publicada en Play Store: generá un keystore nuevo con contraseña
  nueva y usá ese.
- Si **ya** está publicada: no se puede cambiar el keystore de una app existente, salvo
  con Play App Signing. Revisalo en Play Console antes de la próxima actualización.

El keystore nuevo **no** va dentro de ninguna carpeta que sea un repositorio de Git.

---

## Tarea 2 — Actualizar el service worker de notificaciones

**Por qué no lo hago yo:** necesito las claves públicas de Firebase, que están en tus
variables de entorno.

El archivo `mesira-web/public/firebase-messaging-sw.js` tiene marcadores de reemplazo.
Un service worker no puede leer las variables de entorno del bundle, así que hay que
escribir los valores a mano, una sola vez:

```js
firebase.initializeApp({
  apiKey: "AIza...",                              // NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "mesira-argentina.firebaseapp.com",
  projectId: "mesira-argentina",
  storageBucket: "mesira-argentina.firebasestorage.app",
  messagingSenderId: "678...",
  appId: "1:678...:web:...",
});
```

Son claves públicas de Firebase, no hay problema en que queden en el archivo.

**Sin este paso, las notificaciones push no funcionan.**

---

## Tarea 3 — Desplegar las reglas de Firestore y Storage

**Por qué no lo hago yo:** requiere `firebase login` con tu cuenta.

```powershell
npm install -g firebase-tools
firebase login
cd C:\Users\israe\Mesira\mesira-web
firebase use mesira-argentina
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

**Este paso no es opcional.** Si quedan las reglas viejas, el navegador sigue pudiendo
escribir en Firestore y buena parte de lo que se arregló no sirve de nada.

Después, en la consola de Firebase, verificá que las reglas desplegadas coincidan con los
archivos del repositorio.

---

## Tarea 4 — Rotar las credenciales expuestas

**Por qué no lo hago yo:** requiere tus sesiones en Google Cloud, Resend y Gmail. Y no
quiero tener esas claves.

Detalle completo en `SEGURIDAD.md` § 1.2. Resumen:

| Qué | Dónde |
| :--- | :--- |
| Clave privada de la cuenta de servicio de Firebase | Google Cloud Console → IAM → Cuentas de servicio → generar nueva, borrar la vieja |
| API key de Resend | resend.com → API Keys |
| Contraseña de aplicación de Gmail | myaccount.google.com → Seguridad. Revocar y no reemplazar: esta versión no usa SMTP. |

---

## Tarea 5 — Restricciones en las consolas

**Por qué no lo hago yo:** son pantallas web con tu sesión.

1. **Firebase → Authentication → Settings → Authorized domains**
   Que queden solo `mesira.net`, `www.mesira.net` y `localhost`.

2. **Google Cloud → APIs y servicios → Credenciales → la API key del navegador**
   Restricción por referente HTTP: `https://mesira.net/*` y `https://www.mesira.net/*`.

3. **Resend → Domains**
   Verificá que `mesira.net` esté verificado con SPF y DKIM, o los correos van a spam.

4. **Vercel → Settings → Git**
   Si el proyecto sigue apuntando al repositorio viejo, desconectalo y conectá el nuevo.

---

## Tarea 6 — Borrar el repositorio viejo

**Por qué no lo hago yo:** no tengo acceso a tu cuenta de GitHub.

Hacelo **recién después** de que el proyecto nuevo esté funcionando en producción.

`github.com/CHKI541/Mesira` → Settings → abajo de todo → Danger Zone →
**Delete this repository**.

Es lo que corta el acceso al keystore y su contraseña, que siguen siendo recuperables del
historial de Git de ese repositorio.

---

## Lo que sí hice yo

Para que no se rehaga por error:

- Proyecto nuevo completo en `C:\Users\israe\Mesira\mesira-web`, con git inicializado y
  el primer commit hecho (sin remoto: eso lo elegís vos).
- Toda la web reescrita de cero: tablero, ficha, publicar, editar, mi cuenta, alertas,
  moderación, ayuda, términos, privacidad.
- Rediseño completo, documentado en `DESIGN.md`.
- Las 11 vulnerabilidades de la versión anterior, corregidas y documentadas en
  `SEGURIDAD.md`.
- Reglas nuevas de Firestore y Storage escritas (falta desplegarlas: Tarea 3).
- Íconos de la PWA, manifest, service workers, sitemap, robots.
- Scripts de administración y de vaciado del tablero.
- Verificado: build limpio, typecheck estricto, lint sin errores, sin secretos en el
  repositorio, contraste AA en modo claro y oscuro.
