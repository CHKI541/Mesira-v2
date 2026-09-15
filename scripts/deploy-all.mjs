#!/usr/bin/env node
import { execSync } from "node:child_process";

console.log("🚀 Iniciando despliegue completo de Mesira v2...\n");

function run(cmd, desc) {
  console.log(`▶ ${desc}...`);
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`✓ ${desc} completado con éxito.\n`);
  } catch (error) {
    console.error(`\n❌ Error durante: ${desc}`);
    process.exit(1);
  }
}

// 1. Verificación estricta de código (TypeScript + ESLint)
run("npm run check", "1. Verificación de TypeScript y ESLint");

// 2. Despliegue de reglas e índices en Firebase
run(
  'npx firebase deploy --project mesira-argentina --only "firestore:rules,firestore:indexes,storage:rules"',
  "2. Despliegue de reglas de Firestore, Storage e Índices en Firebase",
);

// 3. Envío a GitHub (desencadena build y deploy automático en Vercel)
run("git push origin main", "3. Sincronización con GitHub (Vercel despliega automáticamente)");

console.log("==================================================");
console.log("🎉 ¡DESPLIEGUE COMPLETO Y EXITOSO!");
console.log("• Firebase: Reglas estrictas e índices activos.");
console.log("• GitHub: Código sincronizado en CHKI541/Mesira-v2.");
console.log("• Vercel: Compilando y publicando en https://mesira.net.");
console.log("==================================================");
