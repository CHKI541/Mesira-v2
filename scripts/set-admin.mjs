#!/usr/bin/env node
/**
 * Da o quita permisos de administrador.
 *
 *   node scripts/set-admin.mjs israel@ejemplo.com
 *   node scripts/set-admin.mjs israel@ejemplo.com --quitar
 *
 * El permiso se guarda como un custom claim de Firebase Auth, no como una lista de
 * emails dentro del código. Eso significa que agregar o sacar un moderador NO requiere
 * tocar el código ni volver a desplegar, y que la lista no viaja al navegador.
 *
 * Necesita FIREBASE_SERVICE_ACCOUNT_KEY en el entorno (o en .env.local).
 *
 * Importante: el claim se aplica en el próximo inicio de sesión de esa persona.
 * Por eso el script revoca sus tokens: así la próxima vez que entre, ya es admin.
 */

import { readFileSync, existsSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      let value = rawValue.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadEnv();

const email = process.argv[2];
const remove = process.argv.includes("--quitar") || process.argv.includes("--remove");

if (!email || !email.includes("@")) {
  console.error("Uso: node scripts/set-admin.mjs correo@ejemplo.com [--quitar]");
  process.exit(1);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) {
  console.error("Falta FIREBASE_SERVICE_ACCOUNT_KEY. Cargala en .env.local o en el entorno.");
  process.exit(1);
}

const account = JSON.parse(raw);
initializeApp({
  credential: cert({
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: account.private_key.replace(/\\n/g, "\n"),
  }),
});

const auth = getAuth();

try {
  const user = await auth.getUserByEmail(email);
  const claims = { ...(user.customClaims ?? {}) };

  if (remove) delete claims.admin;
  else claims.admin = true;

  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    remove
      ? `Listo. ${email} ya no es administrador.`
      : `Listo. ${email} es administrador.`,
  );
  console.log("Tiene que cerrar sesión y volver a entrar para que tome efecto.");
} catch (error) {
  if (error.code === "auth/user-not-found") {
    console.error(`No existe ninguna cuenta con el correo ${email}.`);
    console.error("Esa persona tiene que entrar a Mesira con Google al menos una vez primero.");
  } else {
    console.error("Error:", error.message);
  }
  process.exit(1);
}
