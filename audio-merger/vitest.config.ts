import { defineConfig } from 'vitest/config';

/**
 * Pruebas unitarias del CORE en Node (D-12): reducer, validación, errores, i18n,
 * estrategias puras, estimación y registro. El motor real (WASM) NO se prueba aquí:
 * su batería con fixtures reales corre en navegador (demo/selftest.html) porque
 * ffmpeg.wasm 0.12 requiere Worker+importScripts del navegador. Separación declarada
 * en docs/plan.md §12 (honestidad epistémica: no simulamos WASM en Node).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // tests/ui-elemento.test.ts declara su propio entorno con @vitest-environment jsdom.
    reporters: 'default',
  },
});
