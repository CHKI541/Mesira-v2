#!/usr/bin/env node
/**
 * Borra TODAS las publicaciones y arranca el tablero limpio.
 *
 *   node scripts/wipe-products.mjs            (muestra qué haría, no borra nada)
 *   node scripts/wipe-products.mjs --si-borrar (borra de verdad)
 *
 * Qué borra:
 *   - la colección `products` entera, con su subcolección `private/contact`
 *   - los archivos de Storage bajo products/
 *   - la colección `reports` (los reportes apuntan a publicaciones que ya no existen)
 *
 * Qué NO toca:
 *   - `users`: las cuentas y los perfiles quedan intactos
 *   - `alerts`: las alertas de palabra clave siguen funcionando con lo que se publique
 *
 * Esto es lo que se decidió para el pase a la versión nueva: conservar a la gente,
 * empezar el tablero de cero. El esquema de publicación cambió (las fotos ya no son
 * base64 dentro del documento, y `isActive`/`isDelivered` se unificaron en `status`),
 * así que las publicaciones viejas no se verían bien en la interfaz nueva.
 *
 * NO SE PUEDE DESHACER. Hacé un export de Firestore antes si querés red de seguridad:
 *   gcloud firestore export gs://TU-BUCKET/backup-$(date +%F)
 */

import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

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

const confirmed = process.argv.includes("--si-borrar");

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
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${account.project_id}.firebasestorage.app`,
});

const db = getFirestore();

const [products, reports, users, alerts] = await Promise.all([
  db.collection("products").count().get(),
  db.collection("reports").count().get(),
  db.collection("users").count().get(),
  db.collection("alerts").count().get(),
]);

console.log(`\nProyecto: ${account.project_id}\n`);
console.log("Se van a BORRAR:");
console.log(`  publicaciones  ${products.data().count}`);
console.log(`  reportes       ${reports.data().count}`);
console.log("  las fotos de Storage bajo products/");
console.log("\nNO se tocan:");
console.log(`  usuarios       ${users.data().count}`);
console.log(`  alertas        ${alerts.data().count}`);

if (!confirmed) {
  console.log("\nEsto fue solo una simulación. Para borrar de verdad:");
  console.log("  node scripts/wipe-products.mjs --si-borrar\n");
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(
  `\nEscribí el nombre del proyecto (${account.project_id}) para confirmar: `,
);
rl.close();

if (answer.trim() !== account.project_id) {
  console.log("No coincide. No se borró nada.");
  process.exit(1);
}

/** Borra una colección de a tandas, incluyendo las subcolecciones de cada documento. */
async function deleteCollection(name) {
  let total = 0;
  for (;;) {
    const snap = await db.collection(name).limit(200).get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const subs = await doc.ref.listCollections();
      for (const sub of subs) {
        const subDocs = await sub.listDocuments();
        await Promise.all(subDocs.map((d) => d.delete()));
      }
    }

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    total += snap.size;
    process.stdout.write(`\r  ${name}: ${total} borrados`);
  }
  process.stdout.write(`\r  ${name}: ${total} borrados\n`);
}

console.log("\nBorrando...");
await deleteCollection("products");
await deleteCollection("reports");

try {
  await getStorage().bucket().deleteFiles({ prefix: "products/", force: true });
  console.log("  fotos de Storage: borradas");
} catch (error) {
  console.warn("  fotos de Storage: no se pudieron borrar todas —", error.message);
}

console.log("\nListo. El tablero arranca limpio y las cuentas quedaron intactas.\n");
