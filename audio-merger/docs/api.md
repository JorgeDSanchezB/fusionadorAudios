# FASE 3 — Contratos API (públicos y estables)

## 1. Atributos HTML (todos opcionales; tabla de verdad en `src/config/atributos.ts`)

| Atributo | Tipo | Por defecto | Efecto |
|---|---|---|---|
| `locale` | cadena | `es` | Idioma de la UI (locale registrado) |
| `theme` | `auto\|light\|dark` | `auto` | Tema visual |
| `headless` | booleano | `false` | No renderiza UI; solo API (para integraciones programáticas) |
| `format` | cadena | `mp3` | Formato de salida registrado (mp3, wav) |
| `bitrate` | entero | `192` (mp3) | kbps de salida; vacío/nulo para WAV |
| `fade-ms` | entero ≥ 0 | `0` | Fundido entre pistas (opción del post-proceso registrado) |
| `engine-base` | URL/ruta | CDN anclada | Base autohospedada del motor (layout en D-13); vacío = CDN |
| `engine-mode` | `auto\|single\|multi` | `auto` | Modo del core WASM |
| `min-tracks` | entero | `2` | Mínimo de pistas para unir |
| `max-tracks` | entero | `500` | Máximo de pistas en lista |
| `max-file-mb` | número | `2048` | Límite por archivo (MB → bytes) |
| `max-total-mb` | número | `8192` | Límite de Σ entradas |
| `warn-output-mb` | número | `350` | Umbral de aviso por tamaño estimado |
| `max-duration-min` | número/vacío | vacío | Límite duro de duración total; vacío = sin límite |
| `virtualize-threshold` | entero | `50` | Nº de pistas que activa virtualización (>) |
| `output-name` | patrón | `audio-unido-{fecha}.{ext}` | Variables: `{ext}`, `{n}`, `{fecha}` |

Valores ilegibles o vacíos no permitidos → evento `audiomerger:error` con
`CONFIG_INVALID` y el atributo citado. Nunca se corrigen en silencio.

**Atributos desconocidos** (p. ej. `class`, `style`, `data-*` o atributos futuros
no reconocidos): se ignoran SIN error — una página anfitriona puede portar
atributos ajenos; solo los atributos DE ESTA TABLA se validan. La configuración
provista por JS (`resolverConfig`) sí rechaza claves desconocidas.

**Booleanos** (p. ej. `headless`): semántica HTML — presente sin valor
(`<audio-merger headless>`) o con `true/1/yes/si` = activado; `false/0/no` =
desactivado; cualquier otro valor → `CONFIG_INVALID`.

## 2. Propiedades JS (reflejan atributos; getter/setter)

> Implementación materializada en FASE 5 (componente). El contrato queda fijado aquí.

`format`, `bitrate` (number|null), `fadeMs`, `locale`, `theme`, `engineBase`,
`engineMode`, `minTracks`, `maxTracks`, `maxFileMb`, `maxTotalMb`, `warnOutputMb`,
`maxDurationMin` (number|null), `virtualizeThreshold`, `outputName`, `headless` (booleano).

Solo lectura: `tracks` (AudioTrack[] en orden), `options` (MergeOptions vigentes),
`state` (`'idle'|'analyzing'|'running'|'completed'|'error'|'cancelled'`), `result`
(última salida o null), `version`.

## 3. Métodos

> Implementación materializada en FASE 5 (componente). El contrato queda fijado aquí.

| Método | Devuelve | Comportamiento |
|---|---|---|
| `addFiles(files: FileList \| File[] \| File)` | `Promise<readonly AudioTrack[]>` | Valida formato/tamaño, añade al final, lee duración por metadatos; rechazos → evento `error` clasificado por pista |
| `removeTrack(id: string)` | `boolean` | Quita la pista (id estable); false si no existe |
| `reorder(from: number, to: number)` | `readonly string[]` | Reorden por índices 0-based; lanza `INVALID_ORDER` si no cuadran |
| `moveTrack(id: string, delta: number)` | `readonly string[]` | Mueve por id ±posiciones (botones ↑/↓) |
| `setOptions(parcial: Partial<MergeOptions>)` | `MergeOptions` | Valida contra los esquemas registrados; `INVALID_OPTIONS` si algo no cuadra |
| `merge()` | `Promise<MergeOutput>` | Ejecuta la unión (motor diferido); rechaza con MergeError tipado |
| `cancel()` | `void` | Cancela el job activo (USER_CANCELLED) |
| `reset()` | `void` | Limpia job/resultado/error (mantiene la lista) |
| `clear()` | `void` | Vacía la lista |
| `preloadEngine()` | `Promise<void>` | Descarga/compila el motor explícitamente (fuera del arranque) |
| `download()` | `void` | Dispara la descarga del último resultado |

## 4. Eventos (CustomEvent, `bubbles`, `composed`; detalle tipado en `src/core/eventos.ts`)

| Evento | `detail` |
|---|---|
| `audiomerger:track-added` | `{ pista: AudioTrack }` |
| `audiomerger:track-removed` | `{ id, pista }` |
| `audiomerger:reordered` | `{ orden: string[], de, a, origen: 'arrastrar'\|'boton'\|'api' }` |
| `audiomerger:merge-started` | `{ job: MergeJob }` |
| `audiomerger:merge-progress` | `{ stage, progress: 0..1, detail? }` |
| `audiomerger:merge-completed` | `{ blob, url, name, mimeType, size, durationMs, strategy, warnings[] }` |
| `audiomerger:error` | `{ code: ErrorCode, message, details }` |
| `audiomerger:cancelled` | `{ jobId }` |
| `audiomerger:options-changed` | `{ opciones }` |

## 5. Contrato del core (función pública)

```ts
mergeTracks(
  entradas: readonly EntradaUnion[],   // { id, name, blob }
  opciones: MergeOptions,              // validadas contra esquemas registrados
  ctx: {
    config, motor: MotorUnion,         // motor inyectado → core testeable
    planificador, validadorContenedor,
    esquemasOpciones,
    signal?: AbortSignal,              // cancelación cooperativa
    onProgress?: (p: MergeProgress) => void,
  },
): Promise<MergeOutput>
```

- Cancelación: `signal` aborta → el motor se cancela y se rechaza con `USER_CANCELLED`.
- Progreso: etapas ponderadas por `config.engine.progressWeights`
  (`loading-engine` → `probing` → `merging` → `validating`), monotónico 0..1.
- Advertencias visibles: `DURATION_MISMATCH`, `DURATION_ESTIMATED`, `ENGINE_RESTARTED`.
- El motor real se carga BAJO DEMANDA (nunca en arranque); `preloadEngine()` es explícito.

## 6. Errores tipados (códigos estables; tabla completa con mensaje/consejo i18n en README)

`UNSUPPORTED_FORMAT` · `FILE_TOO_LARGE` · `TOTAL_TOO_LARGE` · `DURATION_TOO_LONG` ·
`OUT_OF_MEMORY` · `WASM_LOAD_FAILED` · `BROWSER_UNSUPPORTED` · `USER_CANCELLED` ·
`INVALID_ORDER` · `INVALID_OPTIONS` · `NOT_ENOUGH_TRACKS` · `TOO_MANY_TRACKS` ·
`CORRUPT_FILE` · `CONFIG_INVALID` · `JOB_IN_PROGRESS` · `WORKERFS_UNAVAILABLE` ·
`PROBE_FAILED` · `UNKNOWN_ENGINE_ERROR`

Estructura: `{ code, message (técnico), details, cause? }` (clase `MergeError`,
`toJSON()` estable para eventos/logs).

## 7. No aplica (declarado)

- **Rate limiting:** no hay red propia (solo la descarga del motor, cacheable por el
  navegador); no hay servicio al que proteger.
- **Autenticación/autorización:** no hay backend ni datos remotos de usuario; todo el
  procesado es local. Si el anfitrión restringe su CSP, se documenta (README §CSP).
