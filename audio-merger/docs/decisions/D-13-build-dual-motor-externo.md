# D-13 — Build dual ESM/UMD con motor externo no empaquetado

- **Problema:** la misma librería debe poder consumirse con `<script>` en HTML plano
  (UMD, global `AudioMerger`) y con `import` desde bundlers (ESM); y el presupuesto
  inicial (≤ 30 KB gzip) no puede depender de cómo el bundler resuelve workers de
  paquetes de terceros.
- **Decisión:** Vite en modo librería con dos salidas (`es` y `umd`) desde un único
  entry. El motor ffmpeg NO se empaqueta: se carga en runtime desde `engine-base`
  (CDN anclada por defecto — constantes técnicas versionadas y configurables — o
  autohospedado con layout documentado). El worker del motor nace de una URL blob
  propia (D-02), idéntica en ambos formatos.
- **Coste:** el autohospedaje exige copiar 2–3 archivos del core al host (script
  `sync:demo` documentado); dependencia de la disponibilidad de la CDN cuando no se
  autohospeda (con error tipado y reintento, no silencioso).
- **Alternativa descartada:** empaquetar `@ffmpeg/ffmpeg` en el bundle — además del
  peso, la resolución de su worker interno cambia entre formatos de build y bundlers
  (fallos conocidos de `classWorkerURL`); su utilidad (`toBlobURL`, `fetchFile`) son
  ~40 líneas que ya implementamos.

# Layout de `engine-base` (documentado y estable)

```
<engine-base>/
├── ffmpeg-core.js          ← @ffmpeg/core/dist/umd/ffmpeg-core.js        (ST)
├── ffmpeg-core.wasm        ← @ffmpeg/core/dist/umd/ffmpeg-core.wasm      (ST, ~32 MB)
├── ffmpeg-core.worker.js   ← @ffmpeg/core-mt/dist/umd/ffmpeg-core.worker.js (solo MT)
└── ffmpeg-core.mt.js/.wasm ← variante multi-thread (opcional, core-mt)
```
