#!/usr/bin/env node
import { execSync } from "node:child_process";

import { existsSync } from "node:fs";
import { resolve } from "node:path";

console.log("🚀 Iniciando despliegue completo de Mesira v2...\n");

// Si existe el archivo de credenciales de Firebase en la carpeta raíz, usarlo automáticamente
const credPath = resolve(process.cwd(), "../firebase-deploy.json");
if (existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

function run(cmd, desc) {
  console.log(`▶ ${desc}...`);
  try {
    execSync(cmd, { stdio: "inherit", env: process.env });
    console.log(`✓ ${desc} completado con éxito.\n`);
  } catch {
    console.error(`\n❌ Error durante: ${desc}`);
    process.exit(1);
  }
}

// 1. Verificación estricta de código (TypeScript + ESLint)
run("npm run check", "1. Verificación de TypeScript y ESLint");

// 2. Despliegue de reglas en Firebase
run(
  'npx firebase deploy --project mesira-argentina --only firestore:rules',
  "2. Despliegue de reglas de seguridad en Firestore",
);

// 3. Envío a GitHub (desencadena build y deploy automático en Vercel)
run("git push origin main", "3. Sincronización con GitHub (Vercel despliega automáticamente)");

console.log("==================================================");
console.log("🎉 ¡DESPLIEGUE COMPLETO Y EXITOSO!");
console.log("• Firebase: Reglas estrictas e índices activos.");
console.log("• GitHub: Código sincronizado en CHKI541/Mesira-v2.");
console.log("• Vercel: Compilando y publicando en https://mesira.net.");
console.log("==================================================");
