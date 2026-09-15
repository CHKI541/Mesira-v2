import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Configuración plana de ESLint (Next 16 ya exporta configs planas nativas,
 * así que no hace falta FlatCompat).
 *
 * `npm run check` corre typecheck + lint. Eso es lo que tiene que pasar en CI antes
 * de desplegar: desde Next 16, `next build` ya no ejecuta ESLint por su cuenta.
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "out/**", "scripts/**", "public/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // Nada de <img> suelto: rompe el LCP y el layout salta al cargar.
      "@next/next/no-img-element": "error",
    },
  },
];

export default eslintConfig;
