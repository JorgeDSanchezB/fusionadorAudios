# FASE 4 — Lógica de inserción extensible (Regla del Carro)

## El flujo completo de una unión (y por dónde se extiende)

```
UI (componente) ─► validación de opciones (esquemas del registro)
               ─► mergeTracks (orquestador puro, FASE 3)
                    ├─ motor.ensureLoaded   ← carga DIFERIDA del core (D-02)
                    ├─ motor.sondear        ← UNA ejecución para todas las pistas (D-09)
                    ├─ planificarUnion      ← estrategias PURAS (D-04) + post-procesos
                    ├─ motor.ejecutar       ← WORKERFS + ffmpeg (D-05)
                    ├─ validadorContenedor  ← sniffer del formato de salida
                    └─ motor.medirDuracion  ← chequeo post-unión (advertencia visible)
               ─► Blob de salida ─► descarga
```

**Ninguna extensión toca el núcleo**: ni `core/merge.ts`, ni `core/estrategias.ts`,
ni `engine/ffmpeg.ts` conocen los formatos u opciones concretos; consumen el registro.

## Añadir un formato de ENTRADA (ejemplo real: FLAC ya viene; OPUS como demostración)

```ts
import { registrarFormatoEntrada } from '@zai/audio-merger';

registrarFormatoEntrada({
  id: 'opus',
  extensions: ['opus'],
  mimeTypes: ['audio/opus', 'audio/ogg; codecs=opus'],
  etiquetaKey: 'formato.opus',   // clave i18n (añade el texto en tu locale)
});
```

Eso es TODO: el validador de archivos acepta `.opus`/`audio/opus`, la sonda y el motor
lo tratan genéricamente (códec `opus`), y la regla de copia decide por metadatos.
Test end-to-end en `tests/unit/registry.test.ts` (OPUS) — el archivo deja de ser
rechazado y el planificador ya produce planes correctos con códecs mezclados.
En el navegador, la batería `selftest` une `tono-550.opus + tono-440-est.mp3` tras
registrar el formato desde la consola del test (ver demo/selftest.html).

## Añadir una opción de SALIDA (ejemplo real: OGG de salida)

```ts
import { registrarFormatoSalida, esOgg } from '@zai/audio-merger';

registrarFormatoSalida({
  id: 'ogg', etiquetaKey: 'salida.ogg', mimeType: 'audio/ogg', extension: 'ogg',
  codec: 'libvorbis',
  argsCodificacion: () => ['-c:a', 'libvorbis', '-q:a', '5', '-ar', '44100', '-ac', '2'],
  bitratesKbps: null, bitratePorDefecto: null,
  sampleRateHz: 44100, canales: 2,
  bytesPorSegundo: () => 160_000,          // para la estimación previa
  sniff: esOgg,                             // validación post-unión del contenedor
  codecsNativosParaCopia: ['vorbis'],      // con qué códecs de entrada permite -c copy
});
```

El enum de la opción `format` crece SOLO (esquema dinámico, ver test), la UI de
selectores también (FASE 5 lee el registro), y un nuevo bitrate = añadirlo al array
`bitratesKbps` del descriptor (o registrar otro descriptor de salida).

## Añadir un paso de POST-PROCESO (ejemplo de serie: fundido entre pistas)

Ver `src/extensiones/fundido.ts` (~60 líneas): registra la opción `fadeMs` y el paso
`fundido`, que añade `afade` a cada entrada del grafo de filtros. El núcleo aplica
todos los pasos activos por contrato:

```ts
registrarOpcion({ esquema: { key: 'fadeMs', type: 'int', min: 0, max: 10_000, default: 0 }, etiquetaKey: 'opcion.fade' });
registrarPostProceso({
  id: 'fundido', optionKey: 'fadeMs', requiereRecodificacion: true,
  aplica: (opts) => Number(opts.fadeMs ?? 0) > 0,
  transformar: (plan, ctx) => ({ ...plan, filtros: plan.filtros.map(...añade afade...) }),
});
```

Un `requiereRecodificacion: true` hace que la regla de copia excluya `-c copy` cuando
el paso aplica; el núcleo RECHAZA (CONFIG_INVALID) si un paso declarado no se respeta.

## Estrategia `-c copy` (detección de compatibilidad)

Regla pura (`esCopiaElegible`, testeada sin WASM): códec idéntico en todas las pistas
(por SONDA, no por extensión) + misma tasa + mismos canales + códec nativo del formato
de salida + mezcla de bitrates dentro de `copyRule.bitrateTolerancePct` (VBR/CBR) +
ningún post-proceso que exija re-codificación. AAC de entrada no es nativo de ninguna
salida v1 → siempre re-codifica (priming/edit lists del demuxer concat). Si no se
cumple: `filter_complex` con `aformat` por entrada + `concat` + codec del descriptor.

## WORKERFS y límites

Las entradas se montan en `/input` con WORKERFS (transmitidas, no copiadas a RAM —
verificado que el core 0.12.10 lo registra). Si no estuviera: `WORKERFS_UNAVAILABLE`
(sin degradación silenciosa). La salida vive en MEMFS: pico ≈ 2×S, `unlink` tras leer
y `terminate` tras salidas > `engineRestartAfterBytes` (D-05).

## Justificación de ffmpeg.wasm (D-02)

- **Problema:** unir MP3/WAV/OGG/M4A/FLAC con garantías y sin re-codificar cuando se puede.
- **Coste:** core de ~32 MB diferido (solo se descarga al unir/preload), más lento en
  móvil, techo de memoria del navegador.
- **Alternativa descartada:** Web Audio API + lame.js — decodificación completa a PCM
  en el hilo principal, sin `-c copy`, sin M4A/FLAC/OGG fiables, varios encoders JS.

## Control de entradas peligrosas (nombres, metadatos, datos sensibles)

- Nombres internos `p<N>.<ext>` (D-11): los nombres del usuario jamás llegan a ffmpeg.
- `-map_metadata -1` en toda salida: no se heredan metadatos/ID3 de las entradas.
- No hay persistencia: los `File` viven en memoria de la página hasta cerrar/refrescar;
  los object URLs se revocan (D-02/D-05). Nada se envía a red propia (solo el core).
- Límites por archivo/total/duración: `config/defaults.ts` (validados en FASE 2 y
  APLICADOS en runtime: por archivo y total antes de tocar el motor
  [core/merge.ts], duración dura tras la sonda cuando las duraciones se conocen).
