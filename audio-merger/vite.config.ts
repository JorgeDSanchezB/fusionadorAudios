import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Vite modo librería (D-13): dos salidas — ESM (bundlers) y UMD (etiqueta <script>,
 * global `AudioMerger`). El motor ffmpeg NO se empaqueta: se carga en runtime desde
 * `engine-base` o la CDN anclada (ver src/engine/loader.ts). Sin CSS externo: la hoja
 * del componente se adopta por Shadow DOM.
 */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AudioMerger',
      formats: ['es', 'umd'],
      fileName: (formato) => `audio-merger.${formato}.js`,
    },
    target: 'es2020',
    minify: 'esbuild',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
