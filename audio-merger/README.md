# @zai/audio-merger

**Une varios archivos de audio en uno solo, 100 % en el navegador.** Ningún byte sale
del dispositivo: el procesado ocurre localmente con ffmpeg.wasm cargado en diferido.

Embebible en cualquier web con **una etiqueta `<script>` y una etiqueta
`<audio-merger>`**, sin configuración adicional obligatoria.

- Entradas: **MP3, WAV, OGG, M4A, FLAC** (más las que registres por API).
- Salidas: **MP3 (128/192/320 kbps)** y **WAV**.
- Reordenación por arrastrar-y-soltar **y** botones ↑/↓ accesibles por teclado.
- UI y documentación en **castellano**; textos centralizados en `src/i18n/es.ts`.

---

## Inicio rápido (HTML plano)

```html
<script src="/audio-merger/audio-merger.umd.js"></script>
<audio-merger locale="es"></audio-merger>
```

Por defecto el motor (~32 MB) se descarga de la CDN anclada (jsdelivr, versión fijada)
**solo cuando el usuario pulsa «Unir audios»** — nunca en el arranque. Si prefieres
autohospedarlo (recomendado en producción):

```html
<script src="/audio-merger/audio-merger.umd.js"></script>
<audio-merger engine-base="/ffmpeg" locale="es"></audio-merger>
```

…con este layout en tu servidor (cópialo de `node_modules/@ffmpeg/core/dist/umd`):

```
/ffmpeg/core/ffmpeg-core.js     (112 KB)
/ffmpeg/core/ffmpeg-core.wasm   (~32 MB)
/ffmpeg/core-mt/…               (opcional, multi-thread; ver «Multi-thread»)
```

> Demo autocontenida: `cd audio-merger && bun install && bun run build && bun run dev`
> y abre la URL que imprime Vite (`demo/index.html`). La batería de pruebas del motor
> con archivos reales vive en `demo/selftest.html`.

## Inicio rápido (librería, con bundler)

```ts
import { crearUnion } from '@zai/audio-merger';

const union = crearUnion(); // opcional: overrides de config tipados
const salida = await union.merge(
  [
    { id: 'a', name: '1.mp3', blob: archivoA },
    { id: 'b', name: '2.wav', blob: archivoB },
  ],
  { format: 'mp3', bitrateKbps: 192, fadeMs: 0 },   // opciones validadas contra el registro
  { onProgress: (p) => console.log(p.stage, p.progress) },
);
// salida: { blob, name, mimeType, size, durationMs, strategy, warnings }
descargar(salida.blob, salida.name);
```

Cancelación cooperativa: pasa `{ signal: controlador.signal }` y aborta cuando quieras
(la promesa rechaza con `USER_CANCELLED`).

## API pública del componente

Contrato completo en [`docs/api.md`](docs/api.md). Resumen:

- **Atributos** (todos opcionales): `locale`, `theme` (`auto|light|dark`), `headless`,
  `format`, `bitrate`, `fade-ms`, `engine-base`, `engine-mode` (`auto|single|multi`),
  `min-tracks`, `max-tracks`, `max-file-mb`, `max-total-mb`, `warn-output-mb`,
  `max-duration-min`, `virtualize-threshold`, `output-name`.
- **Métodos**: `addFiles(FileList|File[]|File)`, `removeTrack(id)`, `reorder(from,to)`,
  `moveTrack(id,delta)`, `setOptions(parcial)`, `merge()`, `cancel()`, `reset()`,
  `clear()`, `preloadEngine()`, `download()`.
- **Propiedades**: reflejos de los atributos + `tracks`, `options`, `state`
  (`idle|analyzing|running|completed|error|cancelled`), `result`, `version`.
- **Eventos** (burbujean y cruzan el Shadow DOM): `audiomerger:track-added`,
  `track-removed`, `reordered`, `merge-started`, `merge-progress`, `merge-completed`,
  `error`, `cancelled`, `options-changed` — payloads tipados en `src/core/eventos.ts`.

```js
document.querySelector('audio-merger').addEventListener('audiomerger:merge-completed', (e) => {
  const { blob, url, name, size, durationMs, strategy, warnings } = e.detail;
});
```

## Errores tipados (códigos estables)

Estructura: `{ code, message, details }` (clase `MergeError`), con **mensaje y consejo
accionable por código** en la UI (i18n).

| Código | Significado |
|---|---|
| `UNSUPPORTED_FORMAT` | formato de entrada no registrado |
| `FILE_TOO_LARGE` / `TOTAL_TOO_LARGE` | archivo o Σ de entradas por encima del límite |
| `DURATION_TOO_LONG` | Σ duraciones por encima del máximo (si está fijado) |
| `OUT_OF_MEMORY` | heurística OOM del core (con consejo) |
| `WASM_LOAD_FAILED` | red/CSP/core inaccesible (distinción de causa) |
| `BROWSER_UNSUPPORTED` | sin Worker/WASM |
| `USER_CANCELLED` | cancelación explícita |
| `INVALID_ORDER` / `INVALID_OPTIONS` / `CONFIG_INVALID` | reorden/opciones/atributos inválidos (con detalles) |
| `NOT_ENOUGH_TRACKS` / `TOO_MANY_TRACKS` | mínimos y máximos de pistas |
| `CORRUPT_FILE` | archivo dañado (aislado por pista) |
| `JOB_IN_PROGRESS` | política de un solo job activo |
| `WORKERFS_UNAVAILABLE` | el core no puede transmitir entradas |
| `PROBE_FAILED` | fallo de sonda no clasificable |
| `UNKNOWN_ENGINE_ERROR` | último recurso (con log del motor) |

## Extensibilidad (Regla del Carro)

**Añadir formatos, bitrates o post-procesos no toca el núcleo**: se registra un
descriptor y el resto fluye (UI → validación → estrategia → motor → blob → descarga).
Ejemplos reales ejecutables en los tests y en la batería del navegador:

```ts
import { registrarFormatoEntrada, registrarFormatoSalida } from '@zai/audio-merger';

// Entrada nueva (OPUS): una llamada…
registrarFormatoEntrada({ id: 'opus', extensions: ['opus'], mimeTypes: ['audio/opus'], etiquetaKey: 'formato.opus' });

// Salida nueva (OGG): un descriptor…
registrarFormatoSalida({ id: 'ogg', /* … argsCodificacion, sniff, bitrates … */ });
// → el enum de la opción `format` crece solo y la UI lo ofrece solo.
```

El **fundido entre pistas** (`fade-ms`) es una extensión de serie registrada igual que
lo haría una externa (`src/extensiones/fundido.ts`). Guía completa:
[`docs/extension.md`](docs/extension.md).

## Límites prácticos (declarados, no prometidos)

| Recurso | Cota real |
|---|---|
| Memoria de pestaña | ~2 GB escritorio · ~1 GB móvil (supuesto declarado, no medido por nosotros) |
| Salida unida | ~1 GB escritorio · 400–500 MB móvil (aviso por estimación desde 350 MB, configurable) |
| Entrada por archivo | 2 GB por defecto (se **transmite** con WORKERFS, no se copia a RAM) |
| Σ entradas | 8 GB por defecto |
| Pistas | 500 por defecto (configurable); virtualización desde 50 (DnD fuera, botones ↑/↓ siempre) |
| Tiempo | copia: segundos incluso con horas · re-codificación: depende de CPU |
| Bundle inicial | **28,5 KB gzip** (UMD, sin WASM) · ESM: 32,2 KB gzip |

## Matriz de navegadores

| Navegador | Mínimo | Motor |
|---|---|---|
| Chrome / Edge | 111 | ST (MT si COOP/COEP) |
| Firefox | 111 | ST (MT si COOP/COEP) |
| Safari | 16.4 | ST |

### Multi-thread (opcional)

El core ST no exige cabeceras especiales. Para MT: sirve el core `@ffmpeg/core-mt`
bajo `engine-base` (`/ffmpeg/core-mt/…`) y añade a tu servidor:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Con `engine-mode="auto"` (por defecto) el componente elige MT solo si la página está
`crossOriginIsolated`; con `engine-mode="multi"` sin aislamiento falla de inmediato
con un error accionable. **Nota honesta**: el camino MT está implementado pero la
batería del navegador solo verifica ST (la demo no sirve COOP/COEP); cómo reproducir
la verificación de MT está en `docs/plan.md` §12.

### CSP del anfitrión

La página anfitriona debe permitir `worker-src blob:` (el worker del motor nace de
una URL blob; no hay alternativa portable) y, si usas la CDN por defecto, el acceso
de red hacia ella. Una CSP `script-src 'self'` sin `blob:` rompe el motor: se
reporta como `WASM_LOAD_FAILED` con consejo. Autohospeda el core con `engine-base`
para eliminar la dependencia de CDN.

## Desarrollo y pruebas

```bash
cd audio-merger
bun install
bun run test        # 191 tests unitarios (Node + jsdom): core puro, estrategias,
                   # parser de sonda con logs reales, registro/extensión, componente
bun run typecheck   # tsc --noEmit
bun run build       # vite (ESM + UMD) + declaraciones .d.ts → dist/
bun run fixtures    # regenera tests/fixtures/* con ffmpeg CLI (reproducible)
bun run sync:demo   # copia dist + core + fixtures al host Next.js de la demo
bun run dev         # demo en Vite
```

**Pruebas del motor con archivos reales** (ffmpeg.wasm no corre en Node): abre
`/selftest.html` en la demo (`bun run sync:demo` + host, o `bun run dev` con el core
servido): 12 casos con fixtures reales — MP3+MP3 (copia), mezclas re-codificadas
(WAV/OGG/M4A/FLAC/OPUS-registrado), fundido, corrupto → `CORRUPT_FILE`, cancelación
y componente completo. Resultado real de la última ejecución en `INFORME_ARBITRO.md`.

## Arquitectura y decisiones

- Capas y plan: [`docs/plan.md`](docs/plan.md) · modelo de datos: [`docs/data-model.md`](docs/data-model.md)
- Contratos: [`docs/api.md`](docs/api.md) · extensibilidad: [`docs/extension.md`](docs/extension.md)
- Renderizado/listas: [`docs/rendering.md`](docs/rendering.md)
- Decisiones D-01…D-14 (problema/coste/alternativa descartada): [`docs/decisions/`](docs/decisions/)

## Licencia

MIT. El motor es [ffmpeg.wasm](https://ffmpegwasm.netlify.app) (LGPL en su core,
cargado en diferido y desacoplado de esta librería).
