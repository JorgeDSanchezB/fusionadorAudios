# Worklog — Proyecto Audio Merger (biblioteca Web Component)

Proyecto: librería cliente pura (Vanilla TS + Web Component `<audio-merger>`) que une audios
en el navegador con ffmpeg.wasm diferido. El host Next.js (`/`) sirve como demo real del embed
(script + etiqueta). Sin backend.

Convenciones:
- Cada tarea apenda una sección con `---`, Task ID, agente, log y resumen.
- El árbitro es un subagente independiente con enfoque adversarial.

---
Task ID: 1
Agent: orquestador principal (Z.ai Code)
Task: Sondar entorno real antes de planificar

Work Log:
- Verificado ffmpeg CLI 7.1.5 disponible (generación reproducible de fixtures).
- Verificado bun 1.3.14 y node v24.21.0.
- Dev server Next.js corriendo en :3000 (HTTP 200), dev.log presente (27 líneas, sin errores).
- Discos: 8 GB libres.
- agent-browser disponible con capacidades clave verificadas: `upload` (subida real de archivos),
  `eval` (JS en página), `network requests`, `console`, `errors`, `wait --fn` → verificación E2E real posible.
- Creado `audio-merger/package.json` (vite + vitest + @ffmpeg/* como devDeps: el motor NO se empaqueta,
  se carga en runtime desde base URL configurable — CDN por defecto, autohospedado en la demo).

Stage Summary:
- Entorno con capacidad de verificación real completa (unit tests por vitest + E2E + motor en navegador).
- Decisión estructural: librería en `audio-merger/`, host demo Next.js en `/` con embed literal
  `<script src="/audio-merger.umd.js">` + `<audio-merger>` (prueba viviente del listón de embed).

---
Task ID: 2
Agent: orquestador principal (Z.ai Code)
Task: FASE 1 — Plan estratégico + decisiones de arquitectura

Work Log:
- Leídas las fuentes reales de @ffmpeg/ffmpeg 0.12.15 (classes.js, worker.js) y @ffmpeg/util:
  el protocolo de mensajes es plano y replicable; `exec()` hace `reset()` entre ejecuciones;
  el worker ESM soporta clásico (importScripts) y módulo (import) — decisión D-02/D-13:
  worker propio (blob) + core UMD por importScripts, SIN empaquetar @ffmpeg/ffmpeg.
- Verificado por inspección del binario: WORKERFS compilado en @ffmpeg/core 0.12.10
  (21 refs, registrado en FS.filessystems) → D-05 viable.
- Verificado: strings de mp3lame/vorbis/opus/flac/aac/pcm_s16le presentes en el wasm
  (salidas MP3/WAV y decodificación de entradas confirmables E2E en navegador).
- Escrito docs/plan.md (objetivo, alcance con NO-hace, actores, supuestos, riesgos,
  arquitectura por capas, estructura UI, reducer, índice D-01..D-14, presupuesto ≤30KB,
  matriz navegadores, plan de verificación honesto).
- Escritas decisiones de arquitectura: D-01 (cliente puro), D-02 (ffmpeg.wasm diferido +
  worker propio), D-03 (Web Component + reducer), D-04 (estrategias por registro),
  D-05 (WORKERFS), D-06 (virtualización propia), D-13 (build dual ESM/UMD, motor externo).

Stage Summary:
- FASE 1 documentada en audio-merger/docs/. Lista para el árbitro (Task ID 3).
- Datos duros de entrada: core ST = 112.059 B js + 32.232.419 B wasm; WORKERFS presente;
  libmp3lame presente en wasm.

---
Task ID: 4
Agent: orquestador principal (Z.ai Code)
Task: FASE 2 — Modelado de datos + core puro + tests unitarios reales

Work Log:
- Árbitro F1: 3 rondas (RECHAZADA → RECHAZADA por hallazgo real → APROBADA). Correcciones:
  cadena de memoria 2×S declarada, riesgo CSP + límites, validación post-unión de duración,
  supuestos marcados como tales, lockfile regenerado con versiones exactas.
- Fixtures reales generados con ffmpeg CLI 7.1.5 y verificados con ffprobe (8 archivos:
  MP3 estéreo 128k, MP3 mono 22050/64k, WAV PCM, M4A AAC, OGG vorbis, FLAC, OPUS para
  test de extensión, roto.mp3 que falla con "Invalid data found"). Reproducibilidad
  declarada con precisión: PCM determinista; OGG/Opus con serial aleatorio (hallazgo del
  árbitro verificado por comparación de hashes).
- src/core: types.ts (entidades con id UUID + createdAt, null explícito para ausentes,
  CODIGOS_AVISO fuente única), errors.ts (CODIGOS_ERROR + MergeError + toMergeError con
  clasificación heurística), validation.ts (validador declarativo de opciones),
  tracks.ts (validación/admisión/reorden puros), estimacion.ts (estimación previa +
  límites duros + avisos), reducer.ts (estado por Map+orden, invariantes fail-fast).
- src/config: defaults.ts (TODOS los límites/umbrales/URLs ancladas; warnOutputBytes
  350 MB bajo techo móvil según D-05), validate.ts (resolverConfig: fusión → validar →
  congelar; CONFIG_INVALID con problemas accionables).
- src/i18n: es.ts (TODOS los textos de UI + mensaje/consejo por cada ErrorCode/WarningCode),
  index.ts (registro de locales + t() con interpolación).
- src/utils: id.ts (UUID + fallback), format.ts (es-ES bytes/duración/porcentaje).
- tsconfig strict + tsconfig.build (declaraciones), vite.config (lib ESM+UMD),
  vitest.config (node).
- Tests unitarios REALES ejecutados: 85/85 pasando (8 ficheros). Typecheck limpio.
- docs/data-model.md + D-07 (i18n), D-08 (validador propio), D-10 (duración), D-11 (nombres).

Stage Summary:
- Core puro completo y testeado en Node. Estructuras Map+orden con claves UUID.
- 85/85 tests reales en verde; tsc --noEmit sin errores.

---
Task ID: 6
Agent: orquestador principal (Z.ai Code)
Task: FASE 3 — Contratos API (atributos, propiedades, métodos, eventos, mergeTracks)

Work Log:
- Árbitro F2: 2 rondas (RECHAZADA con 3 bloqueantes ejecutados por él mismo → APROBADA).
  Corregidos: claves de config desconocidas rechazadas (clavesDesconocidas + Object.hasOwn),
  guardas de ciclo de vida del job (id de job en acciones; no-ops idempotentes), invariante
  minTracks implementado (comprobarMinimoPistas), TOO_MANY_TRACKS, heurísticas sin eclipsos,
  residuos cerrados. 97/97 tests.
- src/core/eventos.ts: constantes de eventos (prefijo audiomerger:) + payloads tipados
  (incluye options-changed extra documentado).
- src/core/validar-salida.ts: sniffers puros de contenedores (mp3/wav/ogg/flac/m4a).
- src/config/atributos.ts: tabla declarativa de los 16 atributos HTML + parseo puro a
  overrides de config/opciones/estructural, con CONFIG_INVALID accionable por atributo.
- src/core/merge.ts: ORQUESTADOR mergeTracks(entradas, opciones, ctx) con AbortSignal,
  progreso por etapas ponderadas (config), motor inyectado (MotorUnion), planificador
  inyectado, validación de contenedor, validación de duración (DURATION_MISMATCH como
  advertencia visible), dispose+ENGINE_RESTARTED tras salidas gigantes, clasificación
  de fallos por pista en la sonda.
- docs/api.md: contrato completo (atributos/propiedades/métodos/eventos/mergeTracks/
  códigos de error/declaración de no-aplica rate-limiting y auth).
- Tests de orquestación con MotorSimulado (etiquetado como simulado en cabecera):
  120/120 pasando; typecheck 0 errores.

Stage Summary:
- Contratos ejecutables y probados: eventos, atributos, orquestador con cancelación.
- El motor real y el planificador real se inyectan en FASE 4.

---
Task ID: 8
Agent: orquestador principal (Z.ai Code)
Task: FASE 4 — Lógica de inserción extensible (motor real + registro + estrategias)

Work Log:
- FASE 3 aprobada por el árbitro en 2 rondas; residuos prioritarios cerrados (guarda de
  aborto en ensureLoaded, test discriminante con rechazo genérico, semántica booleana
  documentada, descripcionKey muerto eliminado).
- src/config/registry.ts: registro validado de formatos de entrada/salida, opciones
  (esquemas dinámicos) y post-procesos (PlanEstructural transformable) + nombreInterno (D-11).
- src/core/estrategias.ts: regla de copia pura (D-04) + planificador (copy/reencode +
  aformat + concat + -map_metadata -1) + compilación de argumentos; post-procesos activos
  transforman el plan por contrato.
- src/extensiones/fundido.ts: extensión de serie (opción fadeMs + paso fundido) que
  DEMUESTRA la Regla del Carro sin tocar el núcleo.
- src/engine/worker-source.ts: worker clásico propio (protocolo load/exec/mount/unmount/
  write/read/delete/terminate + eventos log/progress) — SIN empaquetar @ffmpeg/ffmpeg.
- src/engine/loader.ts: carga diferida, ST/MT por crossOriginIsolated, URLs mismo-origen
  directas vs CDN→blob con progreso, comprobarSoporteNavegador (BROWSER_UNSUPPORTED).
- src/engine/probe.ts: parser de log de sonda PURO (regex ajustadas con datos reales:
  M4A con comas, códecs con perfil, Duration sin start, bitrate de Duration como fallback).
- src/engine/ffmpeg.ts: MotorFfmpeg implements MotorUnion (montaje WORKERFS, sonda
  multi-entrada, ejecución con progreso por tiempo/μs, medirDuración ffprobe-lite,
  cancelar/dispose con terminate, clasificación OOM/UNKNOWN por ret+log).
- src/index.ts: registrarBuiltins (5 entradas + 2 salidas + format/bitrate/fade) +
  crearUnion (fábrica de librería).
- Tests: estrategias (regla copia, grafo, fundido, relleno p01..p12, errores), probe con
  logs REALES capturados, registry (OPUS y OGG como extensiones end-to-end nivel lógico,
  enums dinámicos, descriptores defectuosos). 166/166 pasando; typecheck 0 errores.
- docs/extension.md + D-09 (sonda), D-12 (fixtures/pruebas), D-14 (cancelación).

Stage Summary:
- Motor real completo y pendiente de verificación E2E en navegador (Fase 6/selftest).
- Regla del Carro demostrada en tests: OPUS (entrada), OGG (salida), fundido (post-proceso).

---
Task ID: 10
Agent: orquestador principal (Z.ai Code)
Task: FASE 5 — UI del Web Component (render, DnD+teclado, a11y, virtualización)

Work Log:
- Residuos de F4 cerrados: guarda del worker sin 'terminate', limpieza de list.txt,
  test de regresión p1.bin, acción ACTUALIZAR_PISTA en el reducer (duración async).
- src/ui/estilos.ts: hoja adoptada por Shadow DOM, tema auto/light/dark, acento
  esmeralda, foco visible, diálogos, chips, progreso.
- src/ui/metadatos.ts: duración por <audio> efímero (D-10) con timeout y null declarado.
- src/ui/lista-virtual.ts: ventanas puras (calcularVentana, indiceDesdeY).
- src/ui/audio-merger-element.ts (~1090 líneas): componente completo — atributos por
  tabla declarativa (parseAtributos → resolverConfig), API pública (addFiles,
  removeTrack, reorder, moveTrack, setOptions, merge, cancel, reset, clear,
  preloadEngine, download, propiedades + version), eventos audiomerger:* con payloads,
  reconciliación de filas por id, virtualización condicional, DnD con anuncios,
  botones ↑/↓/✕ con aria-labels, foco gestionado, diálogo de aviso por estimación
  (alertdialog + Escape), panel resultado (descarga + preescucha <audio>) y error
  (mensaje+consejo+i18n+reintentar), headless, base HTMLElement condicional (Node/SSR).
- tests/ui-elemento.test.ts (jsdom): registro, render castellano, addFiles con
  validación (UNSUPPORTED_FORMAT/TOO_MANY_TRACKS/CONFIG_INVALID con atributo citado),
  reorden por API + eventos, aria-labels de botones, NOT_ENOUGH_TRACKS, headless,
  clear/reset. 183/183 pasando; typecheck 0.
- docs/rendering.md (claves, virtualización, estados diferenciados, re-renders, a11y).

Stage Summary:
- Componente completo y testeado en jsdom; E2E con motor real en navegador (Fase 6).

---
Task ID: 12-a
Agent: orquestador principal (Z.ai Code)
Task: FASE 5 — correcciones del árbitro (5 rondas) + FASE 6a arranque

Work Log:
- Árbitro F5: RECHAZADA→RECHAZADA→RECHAZADA→RECHAZADA→APROBADA (5 rondas; sondas en
  Chromium real incluidas). Bloqueantes corregidos: suite rota por rechazos no manejados
  (leerDuracion nunca rechaza; pista nunca atascada), virtualización INERTE (maxHeight+
  overflow+espaciador flex:none+display:none; verificado en Chromium: 11 filas de 55,
  scroll de 3960px, un salto al final), 7+1 variantes de i18n con tokens crudos
  (parametrosDeError completo con fallbacks reales de los constructores), doble merge
  con aviso (unionEnCurso), homónimos homotamaño (parejas posicionales), clear/reset
  mid-job (cancel primero + revocación segura), estados invalid/cancelled alcanzables,
  foco por índice, trampa de foco, drop en fila, params de avisos preservados end-to-end,
  revocarURL con guarda, claves i18n muertas fuera.
- 190/190 tests reales, exit 0, 0 errores no manejados, typecheck 0.

Stage Summary:
- FASE 5 APROBADA por el árbitro. Comienza FASE 6 (build, demo, selftest, E2E real).

---
Task ID: 12-b/12-c
Agent: orquestador principal (Z.ai Code)
Task: FASE 6 — build, demo Next.js, selftest del motor, verificación E2E real, README

Work Log:
- Build Vite: UMD 95,9 KB / 28,5 KB gzip (≤30 KB del listón) + ESM 32,2 KB gzip +
  declaraciones .d.ts. CSS compactado en origen (esbuild no minifica literales).
- scripts/sync-host.sh: copia dist + core ST (js 112 KB + wasm 32,2 MB) + fixtures
  reales + selftest.html al host Next.js (/audio-merger, /ffmpeg/core, /fixtures,
  /samples). Layout D-13 documentado.
- demo/selftest.html: batería del motor con fixtures reales (12 casos) — ejecución
  automática + window.__selftest para automatización.
- demo/index.html: demo de la librería con CDN por defecto (embed tal cual).
- src/app/page.tsx: página demo del host — hero, EMBED LITERAL (script + audio-merger
  con engine-base /ffmpeg), botón "Cargar 3 audios de ejemplo" (propio de la demo),
  características, snippet de embebido, límites prácticos, pie pegado al fondo;
  layout.tsx en es-ES con metadata castellana. Lint limpio (ignores para builds y binarios).
- Bugs reales encontrados y corregidos por la verificación E2E:
  1) registrarElemento() nunca se invocaba → el custom element no se definía (ahora
     se define al importar la librería, con guarda para Node/SSR).
  2) importScripts con URL RELATIVA falla en el worker blob → las URLs mismo-origen
     se absolutizan en resolverUrlsCore.
  3) renderizarError() no se llamaba tras JOB_ERROR (panel de error invisible).
  4) La sonda agrupada aborta al primer corrupto → re-sonda individual SIEMPRE que
     falten bloques (aísla al corrupto aunque sea el primero).
  5) Fuga i18n 'resultado.formato' + test permanente de completitud de claves t().
- VERIFICACIÓN REAL (agent-browser, navegador real):
  * Ruta dorada: página → cargar 3 audios → reordenar (Bajar) → Unir → completado
    en 7 s (listón < 60 s). Resultado: MP3 169.944 B, 7.050 ms, reencode, sin avisos,
    botón Descargar + preescucha presentes. Orden preservado tras reorden.
  * Selftest del motor: 12/12 PASS (WASM no cargado en arranque, copy MP3+MP3,
    reencode WAV/OGG/M4A/FLAC→MP3|WAV, OPUS registrado por API, fundido 200 ms,
    corrupto → CORRUPT_FILE, cancelación → USER_CANCELLED, componente completo).
    Duraciones reales validadas contra esperadas (± tolerancia).
  * dev.log sin errores; lint 0 problemas; tests 191/191 exit 0.
- README.md completo: embed, librería, API, eventos, tabla de errores, extensibilidad,
  límites prácticos, matriz de navegadores, COOP/COEP para MT, CSP del anfitrión,
  desarrollo y pruebas.

Stage Summary:
- Todo el sistema verificado E2E en navegador real. Pendiente: árbitro final (LISTÓN)
  e INFORME_ARBITRO.md.

---
Task ID: 15
Agent: orquestador principal (Z.ai Code)
Task: FASE 6 — cierre: corrección del bloqueante final, verificación de reapertura, residuos

Work Log:
- Árbitro final Ronda 1: RECHAZADO con 1 bloqueante (filas fantasma en removeTrack/clear,
  4 repros en Chromium) + 3 no bloqueantes. Los 7 puntos del LISTÓN ya en verde por él.
- Corregido: removeTrack/clear ya no pre-borran el mapa de filas (renderizarLista es el
  único dueño del DOM) + test de regresión; panel de error sin duplicado (título usuario /
  detalle técnico); formato por defecto desde el registro; README «500 por defecto».
- Verificación de reapertura EJECUTADA: repro del árbitro en Chromium (3/3 filas → 2/2 →
  0/0 + mensaje vacío), ruta dorada con SUBIDA REAL por input file: 5,4 s cronometrados
  (MP3 169.944 B / 7.050 ms), selftest re-ejecutado 12/12, tests 192/192 exit 0, lint 0,
  dev.log sin errores, UMD gzip 28.524 B.
- Árbitro final Ronda 2: ENTREGABLE: APROBADO (verificó sus 4 repros + virtualización
  exacta 11 filas/4320px + upload real + merge + selftest + suite). INFORME_ARBITRO.md
  actualizado con nota de lectura y veredicto final.
- Residual trivial restante cerrado: copy de la página demo («500 por defecto»).

Stage Summary:
- ENTREGABLE APROBADO por el árbitro final tras 16 rondas de auditoría adversarial.
- Listón verificado con ejecución real: ruta dorada ≤ 60 s (5-19 s medidos por distintos
  ejecutores), embed de 2 etiquetas, tests con 7 fixtures + selftest 12/12 en navegador,
  cero rellenos, 14/14 decisiones, 28,5 KB gzip UMD, WASM nunca en arranque.

---
Task ID: 3
Agent: árbitro adversarial (Fase 1)
Task: Auditoría adversarial estática del PLAN ESTRATÉGICO (plan.md, D-01..D-06, D-13, package.json)

Work Log:
- Leídos: worklog.md, docs/plan.md, las 7 decisiones existentes (D-01, D-02, D-03, D-04,
  D-05, D-06, D-13) y package.json. Verificación ESTÁTICA de documentación (sin ejecuciones).
- Revisado el checklist a)–m) punto por punto con citas.
- Grep de placeholders/TODO/FIXME/example.com/Lorem en docs: limpio (solo falsos positivos
  del castellano "todo"). package.json sin marcadores.
- Verificado en bun.lock: @ffmpeg/core@0.12.10, @ffmpeg/ffmpeg@0.12.15, @ffmpeg/util@0.12.2
  (versiones del worklog/plan coinciden con el lock).
- Leído tests/fixtures/generate.sh (citado por plan §4): existe, determinista (senoides,
  anoisesrc seed=42, corrupto sin /dev/urandom) — pero los binarios aún NO están en el repo.
- Confirmado: node_modules ausente → las afirmaciones "WORKERFS 21 refs / 112.059 B /
  32.232.419 B / lame presente" NO son reproducibles ahora (no verificado; repro: bun install
  + stat/rg -a sobre node_modules/@ffmpeg/core/dist/umd/).
- Confirmado: docs/decisions/ contiene solo 7 de las 14 entradas del índice plan §9
  (faltan D-07..D-12 y D-14, sin marca de "pendiente").
- Contrastada la aritmética de memoria del plan (§4 techo ~2 GB; D-05 salida ~1,5 GB vía
  MEMFS→Uint8Array→Blob): el pico real es ≥2× la salida → inconsistencia interna.
- Identificado riesgo omitido: CSP del anfitrión (worker-src/script-src blob:, connect-src
  CDN) vs promesa "cualquier web sin configuración adicional" (plan §1).
- Identificada mitigación débil: "validación de cabecera del contenedor" no detecta uniones
  con duración/desync erróneos; copyRule sin VBR/M4A-edit-lists/metadata.

Stage Summary:
- VEREDICTO: FASE 1: RECHAZADA (3 defectos bloqueantes, todos corregibles a nivel de plan).
- Bloqueantes: (1) plan §4 + D-05: aritmética de memoria inconsistente (salida 1,5 GB ⇒
  pico ≥3 GB con la cadena declarada, supera el techo propio de ~2 GB; sin transferibles/
  lectura por trozos/declaración de memory.max del core). (2) D-02/D-13 vs plan §1/§5:
  riesgo CSP del anfitrión omitido — contradice "embebible en cualquier web sin
  configuración adicional". (3) plan §5 + D-04: mitigación de "unión silenciosa
  incorrecta" insuficiente (sin chequeo de duración de salida ≈ Σ duraciones, sin reglas
  VBR/M4A-AAC, sin saneado de metadata/ID3 en copy).
- No bloqueantes: índice §9 con 7 decisiones inexistentes sin marca de pendiente; cola/
  concurrencia del orquestador sin definir; package.json referencia scripts/sync-host.sh y
  tsconfig.build.json inexistentes y usa ^0.12.10 vs "versión anclada"; presupuesto sin
  holgura (suma de máximos = 30 KB justos) y medición solo UMD; afirmaciones sin fuente
  ("~2 GB límite real", "< 60 s" sin hardware, "99% ≤ 50 pistas"); "exactly" anglicismo en
  §6; "los binarios quedan en el repo" aún no cierto.
- Riesgos omitidos detectados: pico worker/página y límites de ArrayBuffer contiguo;
  duración no conocible (FLAC sin SEEKTABLE) que vacía la estimación; metadata heredada/
  ID3 intercalado en copy; tiempo de compilación del wasm en móvil; autoplay en preescucha;
  fuga de object URLs; techo de memoria móvil/iOS no cubierto.
- Checklist: a–e, g–k, m ✅; f ⚠️ (falta cola); l ❌ (afirmaciones sin vía de verificación).

---
Task ID: 3
Agent: árbitro adversarial (Fase 1, re-auditoría)
Task: Re-auditoría del plan tras las correcciones de los 3 bloqueantes (verificación estática + ejecuciones reales)

Work Log:
- Releídos: docs/plan.md, D-02, D-04, D-05, package.json y tests/fixtures/ (8 binarios + generate.sh). D-01/D-03/D-06/D-13 intactos (confirmado por timestamps).
- EJECUTADO de verdad: stat de los 9 archivos de fixtures; ffmpeg/ffprobe real de los 7 fixtures válidos (formatos, duraciones, canales — coinciden con lo declarado) y de roto.mp3 ("Invalid data found when processing input" ✅).
- EJECUTADO: regeneración de fixtures con generate.sh en /tmp/fixcheck (sin tocar el repo) + sha256sum + diff contra el repo: 6/8 idénticos bit a bit; ruido.oga y tono-550.opus DIFIEREN (hashes distintos, tamaños idénticos; cmp -l: 32 y 40 bytes distintos, en los campos serial/granulepos/seq/CRC de las cabeceras de página OGG) → causa: serial de página OGG aleatorio en libavformat.
- EJECUTADO: stat de la caché de bun (@ffmpeg/core@0.12.10): ffmpeg-core.js = 112.059 B y ffmpeg-core.wasm = 32.232.419 B — las cifras del plan §4/§10 son EXACTAS y ahora verificadas.
- EJECUTADO: grep -ao WORKERFS → wasm: 0 ocurrencias; pegamento JS: 21 ocurrencias. El comando "reproducible" citado en D-05 (grep -ac WORKERFS .../ffmpeg-core.wasm) devuelve 0, no 21: apunta al archivo equivocado (las 21 refs están en ffmpeg-core.js).
- EJECUTADO: grep de placeholders/TODO/exactly en docs → limpio ("exactly" eliminado ✅). grep autoplay|ID3v2|gesto → SIN coincidencias: dos correcciones afirmadas por el autor no constan en los documentos.
- EJECUTADO: grep bun.lock → las specs del workspace siguen "^5.6.0/^6.0.0/^3.0.0" (líneas 11-13) mientras package.json usa versiones exactas → lock STALE (bun install --frozen-lockfile fallaría).

Stage Summary:
- VEREDICTO: FASE 1: RECHAZADA (por 1 defecto bloqueante NUEVO, refutado por ejecución; los 3 bloqueantes originales están RESUELTOS y verificados).
- Bloqueante 1 (memoria): RESUELTO — cadena completa en plan §4 + D-05 (pico ≈2×S, transfer sin copia, unlink, terminate tras engineRestartAfterBytes 1 GB, límite ~1 GB, aviso 500 MB, todo configurable), "~2 GB" degradado a SUPUESTO DECLARADO con prueba de humo §12. Residual menor: límite de salida no condicionado a móvil (~1 GB de techo ⇒ salida práctica ~400-500 MB).
- Bloqueante 2 (CSP): RESUELTO — fila §5, sección "Requisitos de CSP" en D-02, WASM_LOAD_FAILED con causa/consejo, promesa §1 acotada.
- Bloqueante 3 (unión silenciosa): RESUELTO — D-04 validación post-unión de duración con tolerancia configurable + advertencia visible, AAC/M4A siempre re-encode, VBR/CBR bajo tolerancia, -map_metadata -1, filas §5, batería §12.
- Defecto bloqueante nuevo (1): plan.md §4 afirma "el script vuelve a generarlos bit a bit" y es FALSO para 2/8 fixtures (ruido.oga, tono-550.opus; serial OGG aleatorio; refutado con regeneración + hashes). Corrección: reformular (contenido PCM determinista; contenedores OGG/Opus con serial variable) o fijar el serial; afecta a D-12 y a cualquier comparación por hash en FASE 4/5.
- No bloqueantes: (2) comando reproducible de D-05 no reproduce (21 refs están en el JS, no en el wasm); (3) bun.lock stale vs versiones exactas de package.json; (4) correcciones afirmadas ausentes en docs (autoplay por gesto, ID3v2 gigante); (5) "99% ≤ 50 pistas" sin fuente ni marca de supuesto; (6) sync-host.sh y tsconfig.build.json aún inexistentes; (7) "< 60 s" sin hardware de referencia; (8) matiz: la duración Xing de MP3 VBR puede dar falsas advertencias en la validación post-unión (mitigado por tolerancia proporcional).
- Verificado positivamente por ejecución: fixtures presentes y válidos (ffprobe), roto.mp3 falla como se declara, tamaños del core exactos (112.059 B / 32.232.419 B), WORKERFS presente (21 refs en el pegamento JS), placeholders limpios.

---
Task ID: 3
Agent: árbitro adversarial (Fase 1, tercera pasada)
Task: Verificación final de las correcciones de la segunda ronda (bloqueante de reproducibilidad + no bloqueantes)

Work Log:
- Releídos: plan.md, D-04, D-05, D-06, bun.lock (primeras 30 líneas). Timestamps confirman
  que solo cambiaron esos 5 archivos en esta pasada (fixtures intactos: sha256sum -c OK 8/8
  contra los hashes de la segunda pasada — sin regeneración encubierta).
- EJECUTADO: grep "bit a bit|99%|exactly|TODO|FIXME" en docs → 0 coincidencias (frases
  retiradas de verdad). Fila de autoplay presente en §5 con "la librería nunca llama a play()".
- EJECUTADO: lectura de bun.lock → workspace devDependencies con versiones EXACTAS
  (0.12.10 / 0.12.15 / 0.12.2 / 5.9.3 / 6.4.5 / 3.2.7) = package.json. Lock ya no está stale.
- EJECUTADO: el comando EXACTO citado en D-05 sobre el core real de la caché de bun:
  `grep -ac WORKERFS ffmpeg-core.js` → devuelve **1** (cuenta LÍNEAS; el JS está minificado
  y las 21 ocurrencias caen en una sola línea), mientras `grep -ao WORKERFS | wc -l` → **21**.
  La afirmación "21 ocurrencias" es CIERTA; el comando citado no reproduce ese número.
- Verificación estática cruzada de las 8 correcciones afirmadas: §4 reproducibilidad precisa
  (coincide con mi hallazgo empírico de la 2ª pasada: PCM determinista, serial OGG aleatorio,
  verificación por ffprobe no por hash) ✅; §5 filas autoplay + ID3v2 ✅; §4 límite de salida
  condicionado a dispositivo ✅; D-06 "supuesto de diseño declarado, no métrica medida" ✅;
  D-04 matiz Xing/VBR con advertencia informativa no bloqueante ✅; deferral de sync-host.sh
  y tsconfig.build.json a FASE 6 aceptado (deuda rastreada) ✅.

Stage Summary:
- VEREDICTO: FASE 1: APROBADA. Sin defectos bloqueantes. Los 3 bloqueantes originales y el
  bloqueante de reproducibilidad (2ª pasada) están resueltos y verificados (estática +
  ejecución real donde fue posible).
- Residuales NO bloqueantes (a rastrear en fases posteriores):
  (1) D-05: el comando reproducible usa `-ac` (devuelve 1 línea) cuando lo que reproduce las
  21 ocurrencias es `grep -ao WORKERFS ... | wc -l` — un carácter de imprecisión en el
  procedimiento declarado, la afirmación de fondo es verdadera y verificada.
  (2) plan §4: la advertencia por defecto (`warnOutputBytes` = 500 MB) queda POR ENCIMA del
  límite práctico declarado en móvil (~400–500 MB): en móvil una unión de 300–500 MB puede
  agotar memoria sin aviso previo. Ajustar en FASE 2 (umbral por clase de dispositivo o
  defecto más bajo, p. ej. ~50% del límite).
  (3) D-05 no refleja el matiz móvil del límite de salida que sí declara plan §4 (deriva
  menor entre documentos).
  (4) Deuda declarada: scripts/sync-host.sh y tsconfig.build.json deben existir en FASE 6
  (el árbitro los verificará entonces); el cronometraje "< 60 s" sigue sin hardware de
  referencia (protocolo de medición ya declarado en §3/§12).
- Condición de cierre: el checklist a)–m) queda ✅/⚠️→✅ (f ahora con política de cola
  declarada; l con supuestos marcados como tales).

---
Task ID: 5
Agent: árbitro adversarial (Fase 2)
Task: Auditoría adversarial INDEPENDIENTE de la FASE 2 (modelado de datos + core puro + config + i18n + utils + tests)

Work Log:
- Leídos íntegros: worklog (Task 1–4 y las 3 rondas del árbitro F1), los 14 ficheros de
  src/ (core: types, errors, validation, tracks, estimacion, reducer; config: defaults,
  validate; i18n: es, index, types; utils: id, format; index), los 8 tests unitarios,
  docs/data-model.md, D-05, D-07, D-08, D-10, D-11, plan.md (§4–§10), package.json,
  tsconfig.json. Nada del proyecto fue modificado.
- EJECUTADO (salida real pegada al final): `bun run test` → 85/85 en 8 ficheros;
  `bun run typecheck` → sin errores (exit 0).
- Sonda adversarial real (script desechable FUERA del repo, `bun run`, importando el src
  con especificadores relativos al proyecto): 12 casos A1–A12 — claves desconocidas en
  resolverConfig, __proto__ en overrides, fusión anidada a 2 niveles, congelación de
  DEFAULT_CONFIG, JOB_PROGRESO tras JOB_ERROR y tras JOB_COMPLETADO, doble
  JOB_INICIADO, avisoPendiente tras JOB_ERROR/FIJAR_OPCIONES, estimación con lista
  vacía y Σ=0, eclipsos de toMergeError (AbortError con "blob", SecurityError no-CSP,
  OOM+blob), formatearBytes(1024/1048576), maxDurationMs=0, limits sustituido por
  string. Resultados clave verificados por ejecución:
  · resolverConfig({limits:{maxTrack:3}}) NO lanza y maxTracks sigue 500 (B1).
  · JOB_PROGRESO tras JOB_ERROR resucita job (running, progress 0.7) con error aún
    presente; tras JOB_COMPLETADO rebaja job.status a 'running'; doble JOB_INICIADO
    reemplaza el job activo en silencio (B2).
  · toMergeError(new DOMException('…blob…','AbortError')) → WASM_LOAD_FAILED (eclipse);
    SecurityError genérico → WASM_LOAD_FAILED+pista 'csp-worker'; 'abort(OOM) at blob' →
    gana "blob" sobre OOM.
  · resolverConfig() sin overrides congela el DEFAULT_CONFIG module-level
    (Object.isFrozen: false→true).
  · formatearBytes(1024)='1 KB'; formatearBytes(1048576)='1 MB' (pasos binarios).
  · Resistido: __proto__ no contamina Object.prototype global; limits como string →
    CONFIG_INVALID; maxDurationMs=0 → rechazado; moverPorId con NaN → INVALID_ORDER.
- Greps: NOT_ENOUGH_TRACKS en src → SOLO errors.ts:28 (definición) y es.ts:101-102
  (i18n): ninguna función lo lanza. TODO/FIXME/placeholder/example.com/Lorem → solo
  falsos positivos del castellano "todo". Ningún test unitario lee los fixtures
  binarios (nombres sintéticos; core puro sin I/O — fixtures verificados por el árbitro
  F1, consumo previsto FASE 4/5). warnOutputBytes en docs: plan.md:58 dice 500 MB vs
  defaults.ts:111 y D-05:17-20 (350 MB).

Checklist FASE 2 (veredicto por punto):
a) ✅ types.ts:15-18 BaseEntity {id, createdAt}; AudioTrack/MergeJob la extienden;
   utils/id.ts crearId (randomUUID + fallback v4 declarado). Matiz: ninguna fábrica de
   FASE 2 une crearId a las entidades (llega en FASE 3); hoy es tipológico.
b) ✅ types.ts:39-56: id, createdAt, name, size, mimeType, extension, durationMs
   (number|null), status, errorCode?, probed — todos presentes y bien tipados.
c) ✅ types.ts:69-81: "tracks" implementado como trackIds (orden EXACTO, data-model.md:14),
   outputFormat, bitrateKbps (number|null), status, progress 0..1, stage, errorCode?,
   startedAt, finishedAt.
d) ⚠️→❌ orden estable ✅ (REORDENAR solo permutaciones, reducer.ts:100-109); ids únicos
   ✅ (ANADIR_PISTAS fail-fast, reducer.ts:75-77); máximos configurables ✅
   (maxFileBytes/maxTotalBytes/maxDurationMs validados y aplicados en tracks.ts:48,98 y
   estimacion.ts:77,84); PERO minTracks es configurable y validado (config) SIN ninguna
   comprobación NOT_ENOUGH_TRACKS en el código (bloqueante 3).
e) ✅ con matiz: validation.ts:41-88 es un validador declarativo real (OptionSchema con
   enum estático/función, nullable, defaults SOLO para ausentes, desconocidas
   rechazadas) → extensible por esquema sin tocar el núcleo; el registro de terceros
   (config/registry.ts, citado en defaults.ts:3) no existe aún — aplazado y declarado
   "(registro en FASE 4)" en tracks.ts:10.
f) ✅ EstadoComponente {porId: ReadonlyMap, orden} (reducer.ts:31-34) + tabla de
   complejidad en data-model.md:30-39; el reducer crea Map/array nuevos en cada acción.
g) ✅ data-model.md:50-54: "No aplica en v1: no hay persistencia" — explícito.
h) ✅ EJECUTADO por mí: 85/85 en 8 ficheros + tsc --noEmit limpio (salida real abajo).
   Matiz honesto: los tests usan DEFAULT_CONFIG y esquemas reales pero NO consumen los
   fixtures binarios de tests/fixtures/ (esperable en core puro sin I/O).
i) ✅ límites/umbrales/URLs/pesos en config/defaults.ts; fuera de config solo
   constantes técnicas justificadas en comentario (1.01/1.03 de contenedor en
   estimacion.ts JSDoc:21-25,43-44; 1024/3600 en format.ts; reglas de validación como
   rowHeightPx≥8 o 1e-6 en validate.ts:42,58). Sin números de negocio sueltos.
j) ❌ la distinción dato-ausente (null) / inválido / config / temporal está bien tipada
   (types.ts, CONFIG_INVALID, RETRYABLE_CODES/NO_RETRY_CODES), PERO resolverConfig
   aplica el default EN SILENCIO ante claves desconocidas (bloqueante 1): un error de
   configuración (typo) queda oculto por el valor por defecto; y avisoPendiente
   sobrevive obsoleto a JOB_ERROR/FIJAR_OPCIONES (no bloqueante 3).
k) ✅ grep en src/tests/docs: limpio (solo falsos positivos del castellano "todo").
l) ✅ con fuga: TODO ErrorCode tiene mensaje+consejo y TODO WarningCode texto (exigido
   por test i18n.test.ts:8-19 para 'es'); el core no tiene literales de usuario por
   diseño (errors.ts:4-5: mensajes técnicos, la UI traduce el código); PERO
   es.ts:99,105 interpolan {detalle} con mensajes técnicos castellanos del core
   (validation.ts:111, validate.ts:74) → en un locale futuro ≠ es el usuario vería
   texto mezclado (no bloqueante 7).

DEFECTOS BLOQUEANTES:
1. config/validate.ts:29-66 + 93-97 — resolverConfig IGNORA EN SILENCIO claves
   desconocidas: `resolverConfig({ limits: { maxTrack: 3 } })` (typo de maxTracks) NO
   lanza y el límite efectivo sigue siendo 500. Contradice el propio encabezado de
   validate.ts:1-4 ("nunca se corrige en silencio (tolerancia a fallos: error de
   configuración ≠ dato faltante)") y D-08:9 ("Claves desconocidas rechazadas", en un
   párrafo que cubre opciones Y configuración). Con atributos HTML no fiables (FASE 3)
   un typo queda indetectable: exactamente el "default que oculta errores" del
   checklist j). Corrección: rechazar claves fuera de la forma de AudioMergerConfig
   (mismo trato que validateOptionValues da a las opciones) + test.
2. core/reducer.ts:124-125 (y 121-122) — ciclo de vida del job SIN guarda:
   (a) JOB_PROGRESO tras JOB_ERROR RESUCITA job (running) dejando `error` presente;
   (b) JOB_PROGRESO tras JOB_COMPLETADO rebaja job.status a 'running' y degrada
   progress con `resultado` aún en estado; (c) doble JOB_INICIADO REEMPLAZA en
   silencio el job activo — plan.md:116-119 declara "sin colas ocultas ni reemplazo
   silencioso" y data-model.md:19 dice que los invariantes "se aplican en código puro y
   fallan rápido". Un onProgress tardío real (abort → JOB_ERROR → callback pendiente)
   corrompe el estado visible. Los 13 tests del reducer no cubren ninguno de estos
   tres casos. Corrección: guarda de estado terminal (ignorar o lanzar según la
   política fail-fast) + tests de eventos tardíos.
3. docs/data-model.md:23-25 vs código — el invariante 3 ("minTracks… se comprueba antes
   de unir (NOT_ENOUGH_TRACKS)") está declarado bajo el encabezado "Invariantes (se
   aplican en código puro y fallan rápido con MergeError)" pero NO EXISTE ninguna
   función que lo compruebe (grep: solo errors.ts:28 y es.ts). Afirmación falsa sobre
   el código actual — viola la honestidad epistémica del proyecto. Corrección:
   implementar la comprobación pura (o marcar explícitamente "se aplicará en merge()
   FASE 4").

DEFECTOS NO BLOQUEANTES:
1. plan.md:58 ("diálogo de advertencia… desde 500 MB") vs defaults.ts:111 y D-05:17-20
   (350 MB): plan.md quedó stale tras el ajuste pedido por el residual 2 del árbitro F1.
2. errors.ts:81-89 — heurísticas ANTES del chequeo de AbortError y patrones demasiado
   anchos ("blob" a secas): AbortError con 'blob' en el mensaje → WASM_LOAD_FAILED;
   SecurityError no-CSP (localStorage/canvas) → WASM_LOAD_FAILED+pista 'csp-worker'
   (consejo de autohospedaje engañoso); 'abort(OOM) at blob' → gana blob sobre OOM.
   Sugerencia: chequear AbortError primero y acotar los patrones al contexto
   worker/importScripts/Failed to construct.
3. reducer.ts:111-141 — avisoPendiente sobrevive a JOB_ERROR, JOB_CANCELADO,
   FIJAR_OPCIONES y ANADIR_PISTAS (verificado por ejecución): aviso de estimación
   obsoleto tras cambiar formato o pistas.
4. validate.ts:93-97 + congelar — resolverConfig() SIN overrides congela el
   DEFAULT_CONFIG module-level como efecto lateral (Object.isFrozen false→true,
   verificado). Benigno (Readonly) pero es mutación observable de estado global por la
   función de resolución.
5. tracks.ts:87-97 — el rechazo por maxTracks usa INVALID_OPTIONS (semánticamente no
   son "opciones de unión"): el usuario ve "Opciones inválidas: límite de pistas
   alcanzado" — clasificación confusa dentro de la propia taxonomía.
6. i18n/index.ts:13-18,37-38 — registrarLocale acepta mapas vacíos/incompletos y t()
   cae silenciosamente al castellano POR CLAVE (mezcla de idiomas visible); D-07:9
   dice que "el test de i18n exige mensaje+consejo para cada ErrorCode" pero solo lo
   exige para 'es'. Además index.ts:22 lanza con prefijo "registrarLocale:" dentro de
   fijarLocale (nombre de función equivocado) y :35 tiene el typo "cadea".
7. i18n/es.ts:99,105 — {detalle} interpola mensajes técnicos castellanos del core en
   texto de usuario (INVALID_OPTIONS/CONFIG_INVALID): fuga del contrato "el core NO
   depende de i18n" para locales futuros (limitación no declarada en D-07).
8. tracks.ts:55-61 vs types.ts:40-41 — un archivo SIN nombre pero con MIME registrado
   se rechaza (UNSUPPORTED_FORMAT "sin nombre ni extensión") aunque types.ts declara
   que el nombre "puede venir vacío"; además extensionDe('.mp3')→'' (tracks.ts:22-25):
   un dotfile con extensión válida pierde su extensión.
9. estimacion.ts:44 — copy con Σ=0 devuelve bytes:null (0 sería la cifra honesta);
   el contrato de bytesPorSegundo vive SOLO en el JSDoc (líneas 22-25) y ningún módulo
   lo calcula aún → si la estimación copy es engañosa para MP3→WAV (cambio de
   estrategia) es NO VERIFICADO: repro en FASE 4 (entradas MP3 + salida WAV deben
   llamar con 'reencode' y bytesPorSegundo=sampleRate×canales×2).
10. validation.ts:46 — `const conocidas` declarada y nunca usada (código muerto;
    tsconfig sin noUnusedLocals, por eso pasa el typecheck).
11. utils/id.ts:10-11 — el fallback "v4" no fuerza el nibble de variante RFC 4122
    (puede generar -4xxx-0xxx-…): imprecisión del "v4" declarado; solo afecta a
    contextos no seguros sin crypto.randomUUID.
12. errors.ts:8 ("tabla en README") y defaults.ts:3 ("config/registry.ts") referencian
    archivos que aún no existen (README.md ausente; registry previsto FASE 4 — deuda
    declarada en tracks.ts:10 pero no en defaults.ts:3).
13. format.ts:18-26 — formatearBytes usa pasos binarios (1024) con etiquetas decimales
    KB/MB/GB (estrictamente KiB/MiB); coherente con su docstring y tests, sin
    contradicción en docs (nitpick).

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test 2>&1 | tail -12
 ✓ tests/unit/reducer.test.ts (13 tests) 6ms
 ✓ tests/unit/tracks.test.ts (11 tests) 7ms
 ✓ tests/unit/errors.test.ts (7 tests) 5ms
 ✓ tests/unit/validation.test.ts (9 tests) 5ms
 ✓ tests/unit/i18n.test.ts (6 tests) 5ms
 ✓ tests/unit/estimacion.test.ts (12 tests) 5ms

 Test Files  8 passed (8)
      Tests  85 passed (85)
   Start at  03:21:02
   Duration  1.50s (transform 146ms, setup 0ms, collect 260ms, tests 59ms, environment 1ms, prepare 389ms)

$ bun run typecheck 2>&1 | tail -5
$ tsc --noEmit
(exit 0, sin salida de errores)

Repro mínima de los bloqueantes (bun, importando el src real):
- B1: resolverConfig({ limits: { maxTrack: 3 } }) → no lanza; cfg.limits.maxTracks === 500.
- B2: estado con job running → JOB_ERROR → JOB_PROGRESO tardío → estado.job vuelve a
  ser {status:'running', progress:0.7} con estado.error aún presente (igual tras
  JOB_COMPLETADO: status 'running' + resultado presente).
- B3: rg NOT_ENOUGH_TRACKS src/ → solo errors.ts y i18n/es.ts.

Stage Summary:
- VEREDICTO: FASE 2: RECHAZADA (3 defectos bloqueantes, todos corregibles con pocas
  líneas + tests; nada requiere re-arquitectura).
- Bloqueantes: (1) resolverConfig ignora en silencio claves desconocidas de
  configuración (demostrado por ejecución; contradice validate.ts:1-4 y D-08 — un typo
  en un atributo quedaría oculto por el default). (2) Ciclo de vida del job sin guarda
  en el reducer: JOB_PROGRESO resucita el job tras JOB_ERROR y rebaja el estado tras
  JOB_COMPLETADO; doble JOB_INICIADO reemplaza en silencio (contradice plan.md §6 y
  data-model.md §Invariantes; sin cobertura en tests). (3) data-model.md declara el
  invariante minTracks→NOT_ENOUGH_TRACKS como aplicado en código puro y no existe
  ninguna comprobación (afirmación falsa sobre el código actual).
- Verificado positivamente: 85/85 tests reales en verde y typecheck estricto limpio
  (ejecutados por el árbitro); entidades bien tipadas con null explícito para ausentes;
  validador de opciones genuinamente extensible con rechazo de desconocidas; Map+orden
  inmutable con complejidades declaradas; i18n 'es' completo (mensaje+consejo por código)
  con test de completitud; cero placeholders; hardcoding esencialmente limpio; D-05 ↔
  defaults.ts coherentes (350 MB) y progressWeights suman 1; DOMException AbortError
  clasifica bien en Node.
- No verificado (sin llamador aún en FASE 2): honestidad de la estimación copy ante
  cambio de estrategia MP3→WAV y el cálculo real de bytesPorSegundo — repro en FASE 4.
- Condición de reapertura: corregir B1–B3 + sus tests; el árbitro re-ejecutará
  `bun run test`, `bun run typecheck` y las tres repros mínimas antes de aprobar.

---
Task ID: 5
Agent: árbitro adversarial (Fase 2, re-auditoría)
Task: Verificación independiente de las correcciones de los 3 bloqueantes + no bloqueantes

Work Log:
- Releídos uno a uno los ficheros corregidos: src/config/validate.ts (clavesDesconocidas +
  clonEstructural), src/core/reducer.ts (guardas de ciclo de vida), src/core/tracks.ts
  (comprobarMinimoPistas + TOO_MANY_TRACKS), src/core/errors.ts (AbortError primero,
  SecurityError con contexto), src/i18n/index.ts y es.ts, src/utils/id.ts (variante 8),
  src/core/validation.ts (variable muerta fuera), docs/plan.md:58 (350 MB),
  docs/data-model.md:23-26 (referencia exacta a comprobarMinimoPistas), D-07:10-14
  (limitación {detalle}), y los tests nuevos de config/reducer/errors/tracks/i18n.
- EJECUTADO: `bun run test` → 96/96 en 8 ficheros (antes 85; +11 tests nuevos);
  `bun run typecheck` → exit 0 sin errores (salidas reales pegadas abajo).
- EJECUTADA sonda adversarial propia (script desechable fuera del repo, bun, importando
  el src real) con las 3 repros de los bloqueantes + ataques NUEVOS contra el código
  corregido (claves heredadas del prototipo, progreso tardío de un job ANTERIOR tras
  reemplazo, NaN en comprobarMinimoPistas, heurísticas con textos mixtos, mapa i18n
  vacío). Resultados por ejecución:
  · R1 resolverConfig({limits:{maxTrack:3}}) → LANZA CONFIG_INVALID con
    details.desconocidas = ['limits.maxTrack']; anidada engine.cdn.coreJsMalo →
    ['engine.cdn.coreJsMalo'] ✓ (bloqueante 1 resuelto).
  · R2 JOB_PROGRESO tras JOB_ERROR → no-op (misma referencia, job sigue null);
    doble JOB_INICIADO → LANZA JOB_IN_PROGRESS ✓; JOB_INICIADO tras error (job null)
    permitido, correcto ✓ (bloqueante 2 resuelto para los 3 casos).
  · R3 comprobarMinimoPistas(1) → NOT_ENOUGH_TRACKS; (2) → null; configurable
    (minTracks 3 → error con 2) ✓ (bloqueante 3 resuelto).
  · R6 DEFAULT_CONFIG NO se congela tras resolverConfig()/resolverConfig({...}) ✓
    (clon antes de congelar).
  · R7 heurísticas: AbortError con 'blob' en el texto → USER_CANCELLED (ya no eclipsa);
    SecurityError suelto → UNKNOWN_ENGINE_ERROR (sin pista 'csp-worker' engañosa);
    mensaje CSP real de Chrome ("Failed to construct 'Worker'… blob:…") →
    WASM_LOAD_FAILED+pista csp-worker; 'abort(OOM) at blob URL' → OUT_OF_MEMORY ✓.
  · R8 registrarLocale('yy', {}) → LANZA "el mapa de mensajes no puede estar vacío" ✓.
- No bloqueantes corregidos verificados: TOO_MANY_TRACKS con código propio (errors.ts:29),
  uso real (tracks.ts:84), i18n completo (es.ts:103-104) y test — y cubierto por el test
  de completitud que itera CODIGOS_ERROR; archivo con MIME válido y nombre vacío aceptado
  (rama eliminada de tracks.ts + test); avisoPendiente invalidado por ANADIR_PISTAS y
  FIJAR_OPCIONES (reducer.ts:81,114 + tests); variable `conocidas` eliminada; UUID
  fallback con variante RFC forzada (id.ts:12 `-8…`); plan.md:58 ahora 350 MB coherente
  con defaults.ts:111 y D-05; data-model.md:24-26 cita comprobarMinimoPistas; D-07
  documenta la limitación de {detalle} técnico en castellano; mensajes de i18n corregidos
  (fijarLocale con su nombre, typo "cadea" fuera).
- ATAQUES NUEVOS contra el fix (hallazgos residuales, ejecutados):
  · R5: JOB_PROGRESO tardío del job ANTERIOR (j1) con el nuevo job (j2) running → la
    guarda comprueba solo `status`, no la identidad → estado.job pasa a ser el objeto
    j1 (id 'j1', progress 0.5). Variante persistente: si ese evento es el último antes
    del JOB_COMPLETADO de j2, el job completado queda con id 'j1' y el resultado de j2
    (verificado: "job completado con id = j1 | resultado = o2.mp3 (de j2)").
  · R4: clavesDesconocidas usa `k in base`, que cubre la CADENA DE PROTOTIPO:
    resolverConfig({toString:1}) y {constructor:{prototype:1}} pasan en silencio
    ('toString' in DEFAULT_CONFIG es true por herencia). Sin polución de prototipo
    (la asignación cae sobre el clon propio congelado) y los typos reales se detectan,
    pero es un bypass de la garantía "claves desconocidas rechazadas".
  · R3b: comprobarMinimoPistas(NaN, …) → null (NaN < minTracks es false): NaN pasa por
    válido (los llamadores reales pasan .length, entero).

Estado de los 3 bloqueantes (verificado por ejecución del árbitro):
- B1 (claves desconocidas en resolverConfig): RESUELTO — LANZA CONFIG_INVALID con ruta
  exacta; +tests config.test.ts:69-91 (incl. "sin overrides NO congela DEFAULT_CONFIG").
- B2 (ciclo de vida del job): RESUELTO — guardas con no-op idempotente y JOB_IN_PROGRESS
  en doble inicio; +4 tests reducer.test.ts:118-164 cubriendo exactamente mis repros.
- B3 (invariante minTracks declarado sin implementar): RESUELTO — comprobarMinimoPistas
  en tracks.ts:168-177 + test tracks.test.ts:114-121 + data-model.md actualizado.

DEFECTOS RESIDUALES (ninguno bloqueante):
1. [no bloqueante, ARREGlar antes de FASE 4] reducer.ts:132-137 — la guarda de
   JOB_PROGRESO no compara `accion.job.id` con `estado.job.id`: un progreso tardío del
   job anterior secuestra al job activo tras un reemplazo legítimo (transitorio), y si
   es el último evento antes de JOB_COMPLETADO, el job completado persiste con el id
   equivocado (repro R5/R5b arriba). Fix de una línea:
   `if (estado.job?.id !== accion.job.id) return estado;` + test.
2. [no bloqueante] validate.ts:26-38 — `k in base` acepta claves heredadas
   (toString/constructor/valueOf/hasOwnProperty) como "conocidas": bypass del rechazo de
   desconocidas (repro R4). Sin impacto de seguridad (clon + freeze, sin polución), pero
   contradice la letra de D-08/validate.ts. Fix: `Object.hasOwn(base, k)`.
3. [no bloqueante] reducer.ts:7 — el comentario "SIEMPRE devuelve estado nuevo" ya no es
   literal: los no-op devuelven la MISMA referencia (y los tests lo afirman con toBe).
   Actualizar el comentario a "nunca muta; no-op devuelve la misma referencia".
4. [no bloqueante] tracks.ts:168 — comprobarMinimoPistas(NaN) → null (NaN no se compara).
   Endurecer con Number.isInteger si se quiere blindar el contrato puro.
5. [no bloqueante, nits de doc] errors.ts:8-14 (enumeración del listón sin
   TOO_MANY_TRACKS, presente en CODIGOS_ERROR:29); tracks.ts:28-29 (JSDoc aún dice
   "sin nombre utilizable", rama eliminada); __proto__ vía JSON.parse se rechaza por la
   ruta heredada ('limits.__proto__.minTracks') en vez de por propia-hasOwn.

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test 2>&1 | tail -8
 ✓ tests/unit/i18n.test.ts (6 tests) 5ms
 ✓ tests/unit/estimacion.test.ts (12 tests) 6ms

 Test Files  8 passed (8)
      Tests  96 passed (96)
   Start at  03:42:59
   Duration  1.45s (transform 144ms, setup 0ms, collect 255ms, tests 61ms, environment 1ms, prepare 369ms)

Detalle por fichero (mismo run): utils 6 · config 23 · reducer 17 · estimacion 12 ·
validation 9 · errors 10 · tracks 13 · i18n 6 = 96.

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
(exit 0, sin salida de errores)

Stage Summary:
- VEREDICTO: FASE 2: APROBADA. Los 3 bloqueantes están RESUELTOS y verificados por
  ejecución propia del árbitro (repros originales lanzan/no-op como corresponde + tests
  nuevos reales); 96/96 tests en verde y typecheck estricto limpio.
- Residuales no bloqueantes (5, numerados arriba): el más importante es la guarda de
  JOB_PROGRESO sin comparación de id del job (secuestro por evento tardío del job
  anterior — repro persistente verificada); se recomienda cerrarlo junto con el fix
  trivial de Object.hasOwn ANTES de que aterrice la orquestación de FASE 4, donde
  nacen los emisores de eventos que lo ejercitan.
- Sigue NO VERIFICADO (sin llamador en FASE 2, heredado de la auditoría anterior):
  honestidad de la estimación copy ante cambio de estrategia MP3→WAV y el cálculo real
  de bytesPorSegundo — repro en FASE 4.
- La FASE 2 queda cerrada con deuda rastreada: guardas por id en el reducer, hasOwn en
  clavesDesconocidas, comentario de inmutabilidad del reducer, NaN en
  comprobarMinimoPistas y 3 nits de documentación.

---
Task ID: 7
Agent: árbitro adversarial (Fase 3)
Task: Auditoría adversarial INDEPENDIENTE de la FASE 3 (contratos API: atributos, propiedades, métodos, eventos, mergeTracks, sniffers, docs/api.md, tests)

Work Log:
- Leídos íntegros: worklog (Task 1–6 + árbitros F1/F2), los 8 archivos auditados
  (core/eventos.ts, core/validar-salida.ts, config/atributos.ts, core/merge.ts,
  index.ts, docs/api.md, tests/unit/merge.test.ts, tests/unit/atributos.test.ts) y los
  ficheros de soporte del contrato (core/types.ts, core/errors.ts, core/validation.ts,
  core/tracks.ts, core/estimacion.ts, config/defaults.ts, config/validate.ts,
  utils/format.ts, package.json). Nada del proyecto fue modificado.
- EJECUTADO (salida real pegada al final): `bun run test` → 120/120 en 10 ficheros;
  `bun run typecheck` → exit 0 sin errores.
- Sonda adversarial propia (3 scripts desechables en /home/z/sondas-arbitro/, FUERA del
  repo, bun importando el src real) con 13 casos A1–A8/B1–B3/C1:
  · A1 parseAtributo('headless','') → {valor:false} EN SILENCIO (contradice api.md:24-25).
  · A2 atributo desconocido ('max-track', typo) → null e ignorado sin aviso.
  · A3 esMp3: [0xFF,0x06]→false ✓ (capa/sincronía), 2 bytes→false ✓, WAV 11 B→false ✓;
    PERO [0xFF,0xEA] (versión MPEG reservada '01') → true (bits de versión sin comprobar).
  · A4 motor.sondear devuelve 3 resultados para 2 entradas → mergeTracks COMPLETA sin
    detectar; el planificador recibe 3 ids para 2 entradas.
  · A5 ids de sonda no coincidentes ("0","1" vs "t0","t1") → COMPLETA sin detectar.
  · A6 abort justo al empezar ejecutar (motor.cancelar() invocado) → ejecutar resuelve
    igualmente y la unión se ENTREGA: signal.aborted=true, sin USER_CANCELLED.
  · A7 abort durante sondear con rechazo genérico (no AbortError) → PROBE_FAILED
    (reintentable) en vez de USER_CANCELLED.
  · A8 onProgress hostil que lanza → toda la unión rechazada con Error SIN tipar
    (code undefined) y motor sin cancelar.
  · B1 motor que regresa fracciones [0.9,0.4,1] → progreso merging visible
    0.15 → 0.87 → 0.47 → 0.95 (NO monotónico; api.md:85 declara "monotónico 0..1").
  · B2 medirDuracion que LANZA → resuelve con durationMs null y sin avisos ✓ (best-effort).
  · B3 entradas con ids duplicados → planificador recibe ["x","x"], ningún rechazo.
  · C1 abort estrictamente DURANTE medirDuracion → la unión QUEDA COLGADA (sin resolver
    ni rechazar tras 500 ms), motor.cancelar() jamás invocado.

Checklist FASE 3 (veredicto por punto):
a) ✅ ATRIBUTOS (atributos.ts:30-50) = api.md §1 (líneas 5-22): los mismos 16 nombres
   kebab uno a uno (format, bitrate, fade-ms, min/max-tracks, max-file-mb, max-total-mb,
   warn-output-mb, max-duration-min, virtualize-threshold, locale, theme, headless,
   engine-base, engine-mode, output-name); defaults coherentes con DEFAULT_CONFIG
   (defaults.ts:100-143: 2/500 pistas, 2048/8192/350 MB, maxDurationMs null, threshold 50,
   audio-unido-{fecha}.{ext}, locale es, mode auto, base null→CDN). Matiz: los defaults de
   format/bitrate/fade-ms son valores de contrato del registro F4 (sin código aún) y
   theme/headless son estructurales F5 — aceptable como contrato declarado.
b) ✅ (contrato declarado; implementación F5) api.md §2:29-35 con tipos (bitrate y
   maxDurationMin number|null, headless booleano); mapeo kebab→camelCase coherente con la
   tabla; src/ui/ está VACÍO (sin componente, correcto por fase). PERO `version` (api.md:35)
   NO existe en código (rg 'version' src/ → 0; package.json 1.0.0 no se expone) y §2/§3 no
   llevan marca de pendiente → defecto no bloqueante 3.
c) ✅ (contrato) api.md §3:39-51: addFiles, removeTrack, reorder, merge, cancel, reset +
   extras moveTrack/setOptions/clear/preloadEngine/download; firmas auto-coherentes
   (merge() → Promise<MergeOutput> alineado con mergeTracks §5; reorder → INVALID_ORDER
   alineado con validation.ts:132-134). Implementación F5, sin contradicciones.
d) ✅ eventos.ts:9-19: los 8 exigidos con prefijo audiomerger: + options-changed extra
   documentado; payloads tipados y coincidentes campo a campo con api.md §4:55-65;
   merge-completed incluye blob Y url (eventos.ts:53-63) y está documentado (api.md:62).
   Nit: DetalleAdvertencia.code es string (eventos.ts:49-51) en vez de WarningCode.
e) ❌ firma EXACTA ✓ (merge.ts:76-80, ctx con signal/onProgress como api.md §5:69-81;
   retorno Promise<MergeOutput> = types.ts:110-118 campo a campo); cancelación REAL en
   load/probe/merge (tests merge.test.ts:159-178 la ejercitan) PERO NO en validating ni
   tras ejecutar → bloqueante 1 (demostrado A6/A7/C1).
f) ✅ errors.ts:17-36: los 8 exigidos (UNSUPPORTED_FORMAT, FILE_TOO_LARGE, OUT_OF_MEMORY,
   WASM_LOAD_FAILED, USER_CANCELLED, INVALID_ORDER, INVALID_OPTIONS,
   UNKNOWN_ENGINE_ERROR) + 10 extra justificados; api.md §6:91-95 lista los mismos 18/18;
   estructura {code, message, details, cause?} (errors.ts:43-49) + toJSON() estable (66-68).
g) ✅ api.md §7:100-105: rate limiting N/A (sin red propia; solo la descarga cacheable del
   motor) y autenticación/autorización N/A (sin backend ni datos remotos) — explícito.
h) ✅ EJECUTADO por mí: 120/120 en 10 ficheros + tsc --noEmit exit 0 (salidas reales abajo).
i) ❌ escalas MB→bytes y min→ms ✓ (tests atributos:18-24), ilegibles → CONFIG_INVALID con
   atributo citado ✓ (tests:35-54), max-duration-min '' → null ✓ (test:30), booleanos
   si/yes/1 ✓ (tests:26-33); PERO headless='' → false silencioso contradice api.md:24-25
   ("vacíos no permitidos → CONFIG_INVALID... Nunca se corrigen en silencio") → bloqueante 2.
j) ❌ (parcial): pesos de progreso 0.05+0.1+0.8+0.05=1 (defaults.ts:137) y el emit final es
   literal 1 (merge.ts:205; test merge:99) ✓; listeners de abort add(once)+finally remove
   por fase, SIN fugas ni duplicados ✓ (merge.ts:114-121, 128-135, 163-171); fallos de
   sonda corrupto-vs-otro clasificados por pista con ids/nombres/causas ✓ pero el titular
   siempre es CORRUPT_FILE si hay ≥1 (merge.ts:141-142, no bloqueante 5); expectedDurationMs
   null → sin chequeo de duración ✓ (merge.ts:192); dispose tras salida gigante ✓ — ocurre
   DESPUÉS de medirDuracion, con advertencia ENGINE_RESTARTED (merge.ts:208-214, test
   merge:194-201); medirDuracion que lanza → null best-effort ✓ (merge.ts:185-190, ejecutado
   B2); PERO cancelación con huecos (bloqueante 1), monotonicidad sin garantizar
   (bloqueante 3), sonda↔entradas sin invariante (A4/A5/B3) y onProgress sin aislar (A8).
k) ✅ merge.test.ts:8-12 declara en cabecera "Motor SIMULADO: estos tests verifican la
   ORQUESTACIÓN... El motor REAL (ffmpeg.wasm) se verifica con fixtures reales en navegador
   (D-12, selftest)" y el título del describe (línea 83) repite "motor simulado". Honesto:
   no se presentan como pruebas del motor real.
l) ✅ grep (mayúsculas y minúsculas) en los 8 archivos: solo falsos positivos del castellano
   ("TODO el conjunto" atributos.ts:136, "Todos", "Métodos", "todo el"); 0 marcadores
   reales, 0 example.com/Lorem/ipsum.

DEFECTOS BLOQUEANTES:
1. merge.ts:131-135 + 174-216 — Cancelación INCOMPLETA, contradice api.md:83 ("signal
   aborta → el motor se cancela y se rechaza con USER_CANCELLED", incondicional):
   (a) tras el finally de ejecutar (169-171) no hay listener ni lanzarSiCancelado en toda
   la fase validating: C1 ejecutado → abort durante medirDuracion deja la unión COLGADA
   indefinidamente (sin resolver ni rechazar), motor.cancelar() jamás invocado; A6
   ejecutado → abort con el listener aún puesto llama motor.cancelar(), pero si ejecutar
   resuelve, la unión se ENTREGA con signal.aborted=true y sin USER_CANCELLED.
   (b) el catch de sondear (131-132) NO tiene la guarda `signal?.aborted → USER_CANCELLED`
   que SÍ tiene el de ejecutar (166-168): A7 ejecutado → abort durante la sonda con
   rechazo genérico del motor → PROBE_FAILED, que está en RETRYABLE_CODES
   (defaults.ts:146): la UI ofrecería REINTENTAR una cancelación explícita del usuario.
   Corrección: cobertura de abort en validating (listener o lanzarSiCancelado antes/después
   de medirDuracion), misma guarda de aborted en los catch de sondear y ensureLoaded, y
   lanzarSiCancelado tras ejecutar + tests de las tres ventanas.
2. atributos.ts:100-103 vs api.md:24-25 — `headless=""` se corrige EN SILENCIO a false
   (A1 ejecutado: {valor:false}). La lista booleana incluye '' deliberadamente (línea 100),
   así que código y contrato se contradicen: la fila headless NO declara vacío permitido
   (a diferencia de bitrate/engine-base/max-duration-min) y §1 promete CONFIG_INVALID para
   vacíos no permitidos. Agravante HTML: `<audio-merger headless>` (atributo booleano
   desnudo, valor "") → false, invirtiendo el idioma estándar de HTML — el usuario escribe
   headless y recibe la UI renderizada sin error. Corrección: '' → CONFIG_INVALID
   (coherente con el docs) o '' → true (idioma HTML) documentándolo en la tabla + test.
3. merge.ts:84-86 vs api.md:85 — §5 declara progreso "monotónico 0..1" pero emitir solo
   acota (Math.min/Math.max), NO mantiene monotonía: B1 ejecutado con fracciones del motor
   que regresan [0.9, 0.4, 1] → progreso merging 0.15 → 0.87 → 0.47 → 0.95 visible al
   consumidor. El test de monotonicidad (merge.test.ts:96-98) solo cubre un motor simulado
   que nunca regresa, así que pasa en verde mientras el contrato no se cumple. Corrección:
   variable de último progreso y Math.max(último, ...) + test con motor que regresa.

DEFECTOS NO BLOQUEANTES:
1. merge.ts:139-154 — el orquestador NO valida la correspondencia sonda↔entradas: sonda
   con MÁS resultados que entradas → planificador recibe 3 ids para 2 entradas y COMPLETA
   (A4); ids no coincidentes → COMPLETA (A5); ids duplicados en entradas → ["x","x"] sin
   rechazo (B3). MotorUnion es superficie pública (index.ts:14) y la "unión silenciosamente
   incorrecta" es la clase de fallo que el propio proyecto trata como peor caso (D-04).
   Invariante barato (misma longitud, mismos ids, sin duplicados) ANTES de que aterrice el
   motor real en FASE 4.
2. api.md §1 — comportamiento ante atributo DESCONOCIDO no documentado: parseAtributo
   devuelve null y parseAtributos lo ignora en silencio (A2: 'max-track' typo → sin
   aviso, límite 500 por defecto). Ignorar atributos ajenos es LO CORRECTO en HTML
   (class/style/data-*), pero el contrato no lo dice; y el comentario de atributos.ts:65
   ("la UI decide avisar, aquí no hay contrato") es una promesa sobre la F5 aún sin
   cumplir. Documentar la política en §1.
3. api.md:29-35 — §2/§3 (y `version` en particular) no llevan marca de pendiente: hoy son
   promesa sin contrapartida en código (rg version → 0; src/ui vacío). Marcar el estado de
   implementación por sección, como se hizo en data-model.md tras el bloqueante 3 de F2.
4. merge.ts:84-86 — onProgress sin aislar: un callback hostil/buggy que lanza rechaza TODA
   la unión con un error SIN tipar (A8) y deja el motor sin cancelar. Envolver en try/catch
   (o documentar que el callback debe ser seguro).
5. merge.ts:141-142 — fallos de sonda mixtos: con ≥1 CORRUPT_FILE el código titular es
   siempre CORRUPT_FILE aunque otra pista haya fallado con PROBE_FAILED/OUT_OF_MEMORY
   (reintentable degradado a no-reintentable); details.causas preserva la verdad pero el
   titular que la UI traduce miente.
6. validar-salida.ts:11-15 — esMp3 no comprueba los bits de versión MPEG (máscara 0x18):
   0xFF 0xEA (versión reservada '01') → true (A3). Los casos preguntados pasan
   correctamente (MP3 de 2 bytes → false; WAV de 11 bytes → false; 0xFF 0x06 → false por
   capa reservada + sincronía). Lenitud asumible en un sniffer de primera línea; declarar.
7. atributos.ts:27 + types.ts:146-149 — código muerto: DescriptorAtributo.descripcionKey
   ("documentación viva") jamás asignado ni leído; MergeContext jamás usado (merge.ts
   define ContextoUnion). Eliminar o cumplir.
8. eventos.ts:49-51 — DetalleAdvertencia.code: string debilita la unión WarningCode de
   MergeWarning (types.ts:104-107): el payload de merge-completed pierde el tipado.
9. Nits: ruido de coma flotante en progress (0.15000000000000002 en B1; redondear); enums
   de atributo case-sensitive sin documentar (theme="AUTO" → CONFIG_INVALID); el catch de
   medirDuracion (merge.ts:185-190) no tiene test propio (verificado solo con mi sonda B2).

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test 2>&1 | tail -8
 ✓ tests/unit/estimacion.test.ts (12 tests) 5ms
 ✓ tests/unit/i18n.test.ts (6 tests) 5ms

 Test Files  10 passed (10)
      Tests  120 passed (120)
   Start at  04:00:40
   Duration  3.22s (transform 201ms, setup 0ms, collect 347ms, tests 1.41s, environment 1ms, prepare 468ms)

Detalle por fichero (mismo run): merge 14 · config 23 · reducer 18 · tracks 13 ·
errors 10 · atributos 9 · estimacion 12 · validation 9 · utils 6 · i18n 6 = 120.

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
(exit 0, sin salida de errores)

Stage Summary:
- VEREDICTO: FASE 3: RECHAZADA (3 defectos bloqueantes, todos de clase
  contrato-declarado-vs-código-real y demostrados por ejecución propia del árbitro;
  ninguno requiere re-arquitectura — arreglos de pocas líneas + tests).
- Bloqueantes: (1) cancelación incompleta: validating sin cobertura de abort (unión
  colgada o entregada tras cancelar) y catch de sonda sin guarda aborted → PROBE_FAILED
  reintentable en una cancelación del usuario; (2) headless="" corregido en silencio a
  false, contradiciendo §1 y el idioma HTML de atributos booleanos desnudos;
  (3) progreso no monotónico garantizado pese a declararlo §5 (regresión visible con
  fracciones del motor que retroceden).
- Verificado positivamente: tabla de atributos 16/16 documentada y coherente con
  DEFAULT_CONFIG; eventos 9/9 tipados y documentados campo a campo (merge-completed con
  blob y url); códigos de error 18/18 con estructura {code,message,details,cause} y
  toJSON; §5 firma y MergeOutput exactos; §7 no-aplica declarado; index.ts exporta TODO
  lo que api.md promete (MergeError, mergeTracks, EVENTOS, ATRIBUTOS, parseAtributo(s),
  tipos de motor/contexto, sniffers, DEFAULT_CONFIG); MotorSimulado etiquetado con
  honestidad; 120/120 tests reales y typecheck limpio EJECUTADOS por el árbitro; cero
  placeholders reales (solo falsos positivos del castellano "todo").
- NO VERIFICADO (sin motor real hasta FASE 4): comportamiento del ffmpeg.wasm tras
  terminate/cancel, el aviso real por fracciones de ejecución y la gestión de object
  URLs del componente (F5). El peso de cada etapa (0.05/0.1/0.8/0.05) es un supuesto de
  diseño sin medición — repro en D-12.
- Condición de reapertura: corregir los 3 bloqueantes + tests de las tres ventanas de
  cancelación (A6/A7/C1), del booleano vacío (A1) y de la monotonicidad (B1); el árbitro
  re-ejecutará `bun run test`, `bun run typecheck` y las repros antes de aprobar.

---
Task ID: 7
Agent: árbitro adversarial (Fase 3, re-auditoría)
Task: Verificación independiente de las correcciones de los 3 bloqueantes + no bloqueantes de la FASE 3

Work Log:
- Releídos uno a uno los archivos corregidos: src/core/merge.ts (04:12), src/config/atributos.ts
  (04:10), src/core/validar-salida.ts (04:10), src/core/types.ts (04:11), docs/api.md (04:13),
  tests/unit/merge.test.ts (04:11), tests/unit/atributos.test.ts (04:11). Timestamps confirman
  que SOLO cambiaron los 7 archivos declarados (reducer/tracks/errors/config/tests de F2
  intactos — sin cambios encubiertos). eventos.ts e index.ts sin cambios (constantes).
- EJECUTADO: `bun run test` → 126/126 en 10 ficheros (antes 120; +6 tests nuevos: 5 en
  merge.test.ts, 1 en atributos.test.ts; ningún test original eliminado ni debilitado —
  releídos los 19+10 actuales contra los 14+9 de la primera pasada); `bun run typecheck` →
  exit 0 sin errores (salidas reales pegadas abajo).
- EJECUTADA sonda adversarial propia de re-auditoría (script desechable en
  /home/z/sondas-arbitro/sonda-f3-re.ts, bun, importando el src real) reproduciendo MIS
  repros originales + los casos DISCRIMINANTES que los tests nuevos del proyecto no cubren:
  · R1 (B2/A1): parseAtributo('headless','') → true (semántica HTML); ' ' → true; 'quizas' →
    CONFIG_INVALID. ✓
  · R2 (B1): motor con fracciones regresivas [0.9,0.4,1] → secuencia emitida al consumidor
    0 → 0.05 → 0.15 → 0.87 → 0.95 → 1: SIN regresión visible. ✓
  · R3 (A7, discriminante): abort durante sondear con rechazo GENÉRICO (no AbortError) →
    USER_CANCELLED (la guarda signal?.aborted de merge.ts:142 funciona; el test nuevo del
    proyecto usa rechazo AbortError, que pasaría también SIN la guarda vía toMergeError — mi
    sonda es la única verificación discriminante). ✓
  · R4 (residual nuevo): abort durante ensureLoaded con rechazo GENÉRICO → WASM_LOAD_FAILED
    (reintegrable) en vez de USER_CANCELLED — el catch de la carga (merge.ts:127-128) es la
    única ventana sin la guarda. motor.cancelado=true (el motor SÍ fue avisado). Ver
    residuales.
  · R5 (A6): abort justo tras resolver ejecutar → USER_CANCELLED; la unión NO se entrega. ✓
    (lanzarSiCancelado de merge.ts:197 con comentario de contrato).
  · R6 (C1): motor que viola su contrato y NUNCA resuelve medirDuracion tras cancelar →
    mergeTracks sigue colgada, PERO motor.cancelado=true: el orquestador avisó al motor
    (listener merge.ts:210-218). La protección del colgado descansa ahora en el contrato
    documentado del motor («La promesa en vuelo debe rechazar», MotorUnion:42) — a verificar
    con el motor real en F4.
  · R7 (A4/A5/B3): sonda con 3 resultados/2 entradas → PROBE_FAILED; ids no coincidentes →
    PROBE_FAILED; entradas con id duplicado → PROBE_FAILED (invariante merge.ts:149-158
    verificado en los tres modos). ✓
  · R8 (A8): onProgress hostil → la unión RESUELVE (aislado, merge.ts:90-94). ✓
  · R9 (A3): esMp3: 0xFF 0x06→false, 0xFF 0xEA→false (versión reservada), 0xFF 0xF9→false
    (layer 00), 0xFF 0xFB→true, 2 bytes→false. Bits de versión y layer ahora comprobados
    (validar-salida.ts:14-16) con tests (merge.test.ts:284-285). ✓
  · R10 (A2): atributo desconocido ignorado sin error — ahora DOCUMENTADO en api.md:27-30
    (política explícita + contraste con resolverConfig que sí rechaza). ✓
- Verificación estática de las correcciones declaradas una a una:
  · Listener de abort alrededor de medirDuracion con finally removeEventListener:
    merge.ts:210-218 ✓; lanzarSiCancelado tras la medición: merge.ts:220 ✓; tras ejecutar:
    merge.ts:197 ✓; catch de sondear con signal?.aborted primero: merge.ts:142 ✓; catch de
    medirDuracion best-effort intacto: merge.ts:213-215 ✓.
  · Booleano HTML: atributos.ts:98-108 (''/true/1/yes/si/sí → true; false/0/no → false;
    ilegible → CONFIG_INVALID) + test atributos.test.ts:18-24 ✓.
  · Monotonicidad: emitir con progresoMaximo (merge.ts:84-96, clamp + descarte de
    regresiones) + aislamiento de onProgress en el mismo emitir (try/catch) ✓. Sin problema
    de TDZ (progresoMaximo se inicializa en línea 96, antes de la primera llamada en 120).
  · Invariante sonda↔entradas: merge.ts:149-158 (longitud, duplicados, ids desconocidos =
    biyección) + test merge.test.ts:259-265 ✓.
  · api.md: §2/§3 con nota «Implementación materializada en FASE 5. El contrato queda
    fijado aquí» (líneas 34 y 46) ✓; política de atributos desconocidos §1:27-30 ✓.
  · MergeContext eliminado de types.ts (grep: 0 referencias en src/) ✓;
    descripcionKey sigue muerto (residual).
  · VENTANAS DE ABORT completas por recorrido síncrono: los únicos puntos de_yield_ son los
    cuatro awaits (ensureLoaded, sondear, ejecutar, medirDuracion) y los cuatro tienen
    listener + lanzarSiCancelado tras resolución (112, 135, 179, 197, 220); entre ellos no
    hay awaits, luego no hay huecos intercalables en el event loop.
- Placeholder grep (mayúsculas/minúsculas) sobre los 7 archivos cambiados: solo el falso
  positivo del castellano «TODO el conjunto» (atributos.ts:140). Limpio.

Estado de los 3 bloqueantes (verificado por ejecución del árbitro):
- B1 (cancelación incompleta): RESUELTO — las tres ventanas demostradas (A6 entrega tras
  abort, A7 PROBE_FAILED por aborte, C1 colgado en validating) ahora rechazan USER_CANCELLED
  o avisan al motor (R3/R5/R6); tests nuevos merge.test.ts:222-238. Residual menor: el catch
  de ensureLoaded (ventana de carga) quedó sin la guarda (R4, residuo 1).
- B2 (headless="" corregido en silencio a false): RESUELTO — semántica HTML ('' = true),
  ilegible → CONFIG_INVALID (R1); test atributos.test.ts:18-24.
- B3 (progreso no monotónico garantizado): RESUELTO — clamp monotónico verificado con
  fracciones regresivas reales (R2); test discriminante merge.test.ts:240-248
  ([0.5,0.2,0.9,0.4,1]).

RESIDUALES (ninguno bloqueante):
1. [no bloqueante, prioridad ALTA, cerrar en FASE 4] merge.ts:127-128 — el catch de
   ensureLoaded NO comprueba signal?.aborted: abort durante la carga + rechazo genérico del
   motor → WASM_LOAD_FAILED (en RETRYABLE_CODES) en vez de USER_CANCELLED (R4 ejecutado).
   Mitigaciones existentes: motor.cancelar() SÍ se invoca (listener), un rechazo AbortError
   clasifica correctamente vía toMergeError, y si ensureLoaded resuelve tras el abort,
   lanzarSiCancelado (línea 135) gana. Era el cuarto punto de mi prescripción original del
   bloqueante 1 (no de su enunciado demostrado); con el motor real de F4 —cuyo tipo de
   rechazo tras terminate() es hoy incognoscible— la guarda es barata y elimina la clase.
2. [no bloqueante, F4] R6: si un motor viola su contrato documentado y no rechaza tras
   cancelar(), mergeTracks queda colgada (el orquestador ya cumplió: avisó al motor).
   Repro pendiente con el motor real (terminate() → la promesa debe rechazar).
3. [no bloqueante] merge.ts:163-164 — titular CORRUPT_FILE en fallos mixtos de sonda sin
   cambio (details.causas preserva la verdad; el código que la UI traduce degrada
   reintegrables a no-reintegrables).
4. [no bloqueante, doc] api.md §1 no documenta la semántica booleana HTML (presente/"" =
   true; "no"/"false"/"0" = false): la tabla solo dice «booleano» y las líneas 24-25 hablan
   de vacíos no permitidos. Una línea lo cierra.
5. [no bloqueante, cobertura] los tests nuevos de cancelación en sonda/medición usan rechazo
   AbortError, que NO discrimina la nueva guarda (pasarían también sin ella por
   toMergeError): la verificación discriminante la hizo mi sonda R3 con rechazo genérico;
   sugerir variantes con rechazo genérico en el repo.
6. [no bloqueante, nits] descripcionKey sigue declarado-sin-uso (atributos.ts:27);
   DetalleAdvertencia.code: string debilita WarningCode (eventos.ts:49); ruido de coma
   flotante en progress (0.15000000000000002 en R2); headless='' aceptado sin declarar
   permiteVacio en el descriptor (caso especial justificado solo en comentario de código).

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test 2>&1 | tail -6
 Test Files  10 passed (10)
      Tests  126 passed (126)
   Start at  04:16:18
   Duration  3.41s (transform 199ms, setup 0ms, collect 360ms, tests 1.57s, environment 1ms, prepare 470ms)

Detalle por fichero (mismo run): merge 19 · config 23 · reducer 18 · tracks 13 ·
errors 10 · atributos 10 · estimacion 12 · validation 9 · utils 6 · i18n 6 = 126.

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
(exit 0, sin salida de errores)

Stage Summary:
- VEREDICTO: FASE 3: APROBADA. Los 3 bloqueantes están RESUELTOS y verificados por
  ejecución propia del árbitro con los casos DISCRIMINANTES (rechazo genérico no
  AbortError para la guarda de aborte; fracciones regresivas reales para la
  monotonicidad; ''/ilegible para el booleano HTML). 126/126 tests reales en verde y
  typecheck estricto limpio (ejecutados por el árbitro); +6 tests nuevos sin debilitar
  ninguno existente; solo cambiaron los 7 archivos declarados.
- Correcciones de no bloqueantes verificadas: invariante sonda↔entradas (3 modos),
  política de atributos desconocidos documentada, §2/§3 marcadas como contrato-fijado
  (implementación F5), esMp3 con bits de versión/layer, MergeContext muerto eliminado,
  onProgress aislado.
- Residuales no bloqueantes (6, numerados arriba): el más importante es la ventana de
  CARGA sin guarda de aborte (R4, WASM_LOAD_FAILED reintegrable tras una cancelación) —
  cerrarla junto con la verificación del contrato de rechazo del motor real (residuo 2)
  ANTES de cerrar la FASE 4, cuando el motor deja de ser simulado.
- Sigue NO VERIFICADO (sin motor real hasta FASE 4): rechazo efectivo de las promesas del
  motor tras terminate(), fracciones reales de progreso de ffmpeg y gestión de object URLs
  del componente (F5).

---
Task ID: 9
Agent: árbitro adversarial (Fase 4)
Task: Auditoría adversarial INDEPENDIENTE de la FASE 4 (lógica de inserción extensible: motor ffmpeg.wasm real, registro de formatos/opciones/post-procesos, estrategias)

Work Log:
- Leídos los 9 archivos fuente de la fase + docs/extension.md + D-02/D-05/D-09/D-12/D-14 +
  core/merge.ts, core/types.ts, core/validation.ts, config/defaults.ts, config/validate.ts,
  core/tracks.ts, core/estimacion.ts y los 3 tests nuevos (estrategias 17, probe 9, registry 13).
- Comparado el protocolo del worker propio (worker-source.ts) LÍNEA A LÍNEA contra el real
  @ffmpeg/ffmpeg 0.12.15 (node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js) y contra la API
  REAL de @ffmpeg/core 0.12.10 (node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js, inspección
  del bundle): exec= setTimeout→exec→ret→reset idéntico al original; load idempotente
  (MEJOR que el original, que re-importa); mount hace mkdir+mount (el original NO hace mkdir
  — verificado en el core que FS.mount hace lookupPath y LANZA ENOENT sin directorio: el
  worker propio evita el gotcha upstream); write de string funciona (FS.writeFile codifica
  UTF8, verificado en el bundle); read transfiere el buffer (patrón del original);
  mainScriptUrlOrBlob+'#'+btoa({wasmURL,workerURL}) replicado exactamente (verificado
  _locateFile en el core: .wasm→wasmURL, .worker.js→workerURL); WORKERFS presente y monta
  File por nombre con FileReaderSync perezoso (streaming real, sin copia a RAM).
- DESCARGADO por mí el core-mt 0.12.10 de la CDN anclada (mismo origen/versión que
  defaults.ts) y verificado: PThread.initMainThread preasigna 32 workers DURANTE init
  (pthreadPoolSize=32 → new Worker(locateFile("ffmpeg-core.worker.js")) antes de que
  resuelva Module.ready) → revocar el blobURL del worker tras la carga (loader.ts:148 +
  ffmpeg.ts:78) es SEGURO para esta versión exacta; getNewWorker solo alocaría perezosamente
  con >32 pthreads concurrentes (inalcanzable en audio). Refuta mi hipótesis inicial de fuga.
- Ejecutadas sondas REALES con ffmpeg 7.1.5 sobre los 8 fixtures: las líneas de
  probe.test.ts son REALES y verbatim (MP3/M4A/WAV/OGG/FLAC/OPUS/ROTO); las líneas extra
  reales ("Guessed Channel Layout", "Format mp3 detected only with low score") son ignoradas
  correctamente por el parser. Verificado además con WAV 6 canales generado por mí: ffmpeg
  7.1.5 imprime «5.1» (no «6 channels») cuando el layout es conocido → hallado B2.
- Ejecutadas repros propias contra el src real (bun): divergencia planificador↔motor para
  archivos sin extensión (B1), elegibilidad de copia con canales desconocidos (B2), límites
  por-archivo/duración no aplicados en mergeTracks (B3), idempotencia de registrarBuiltins,
  re-registro tras reiniciarRegistros, y validación de overrides en crearUnion (CONFIG_INVALID
  con typo, fábrica sin red).
- Ejecutados por el árbitro: `bun run test` (166/166) y `bun run typecheck` (0 errores) —
  salidas pegadas abajo.

CHECKLIST FASE 4:
a) ✅ OPUS demostrado SIN tocar núcleo: registrarFormatoEntrada en 1 llamada
   (registry.test.ts:35-57) + fixture tono-550.opus + parser real de la línea
   «Audio: opus, 48000 Hz, stereo, fltp» (verificada por mí contra ffmpeg 7.1.5).
   Nivel lógico; el E2E de navegador está declarado para Fase 6 (D-12).
b) ✅ OGG de salida demostrado (registry.test.ts:90-116: registro + sniffer + vorbis+vorbis
   copiable); el enum de `format` crece DINÁMICAMENTE (esquema values()=>registro vivo,
   test 147-158 con salida «extra» apareciendo en el enum). resolverBitrate valida contra
   el descriptor (INVALID_OPTIONS con 999 y con bitrate en WAV).crearUnion lee
   esquemasOpcionesRegistradas() DENTRO de merge() (por llamada, no snapshot) → las opciones
   registradas a posteriori funcionan.
c) ✅ fundido.ts registra opción fadeMs + post-proceso «fundido» por clave (optionKey
   validado contra el registro de opciones, registry.ts:188-194); requiereRecodificacion
   respetado en esCopiaElegible (estrategias.ts:37) y con salvaguarda CONFIG_INVALID si un
   paso declarado no se respeta (estrategias.ts:158-166). Transformación pura del plan ✅.
d) ✅ D-02 justifica problema/coste/alternativas (Web Audio+lame.js descartada con razones
   técnicas concretas; coste ~32 MB diferido; CSP declarada como limitación).
e) ✅ Regla -c copy declarada y PURA: sonda de TODAS las pistas en UNA ejecución (D-09,
   motor monta todas y usa las rutas de la sonda), códec/tasa/canales idénticos
   (estrategias.ts:44-46), códec nativo del formato de salida (AAC jamás nativo en las
   salidas de serie → siempre re-codifica, testeado), tolerancia VBR/CBR configurable
   (copyRule.bitrateTolerancePct, testeado dentro/fuera), y si no se cumple:
   filter_complex con aformat POR ENTRADA + concat=n:v=0:a=1 + codec del descriptor
   (estrategias.ts:91-95) — y -map_metadata -1 en AMBAS estrategias (L89 y L95, testeado).
   EXCEPCIÓN: la igualdad de canales se cumple con «desconocido==desconocido» (0==0) → B2.
f) ✅ WORKERFS monta File sin cargar GB (File→WORKERFS lazy con FileReaderSync, verificado
   en el core real); límites declarados (maxFileBytes 2 GB / maxTotalBytes 8 GB /
   restartAfterBytes 1 GB → dispose+ENGINE_RESTARTED en merge.ts:239-245);
   WORKERFS_UNAVAILABLE se lanza sin degradación silenciosa (montar y medirDuracion).
   PERO los límites de tamaño POR ARCHIVO y duración NO se aplican en el camino real → B3.
   Y un exec fallido deja /input montado + list.txt/salida parcial en MEMFS hasta el
   siguiente montar() (que desmonta antes) o dispose → NB1.
g) ❌ Tamaño TOTAL ✅ (erroresDeLimites en merge.ts:116); tamaño POR ARCHIVO ❌ (solo en
   validarArchivoEntrada, SIN llamador en runtime — es F5); duración máxima ❌ (el único
   chequeo se hace con durationMs:null fijo en merge.ts:116 → nunca aplica; sin re-chequeo
   post-sonda cuando las duraciones ya se conocen). docs/extension.md:109 declara
   «Límites por archivo/total/duración: validados» → afirmación falsa sobre el código → B3.
   Profundidad de opciones: esquema plano, sin anidamiento (N/A) ✅. Nombres peligrosos:
   p<N>.<ext> D-11 ✅ (sondeo de traversal propio: extensión con '/' produce nodo inalcanzable
   → ENOENT ruidoso, sin escape). Datos sensibles: cero persistencia (rg localStorage/&c = 0),
   -map_metadata -1, nada sale a red propia ✅.
h) ✅ Carga diferida REAL (importar index no crea worker/blob/red; registrarBuiltins puro;
   worker solo en ensureLoaded; blobURL del worker cacheado por página). ST/MT por
   crossOriginIsolated en modo auto ✅ (ST por defecto sin COOP/COEP); revocación de
   objectURLs del core tras la carga VERIFICADA segura incluso para MT (core-mt 0.12.10
   preasigna los 32 pthreads durante init — verificado por mí sobre el binario real);
   cancelación terminate+rechazo de pendientes+recarga perezosa ✅ (código; el
   comportamiento runtime del wasm queda para navegador).
i) ✅ Ejecutado por el árbitro (salidas reales abajo).
j) ✅ probe.test.ts declara su origen en la cabecera (L4-8); verifiqué TODAS las líneas
   contra ffmpeg 7.1.5 real — coinciden verbatim (M4A con comas, aac (LC) con perfil,
   primer token del códec, fallback del bitrate a Duration, OPUS sin bitrate de trama).
   canalesDe: «mono»/«stereo»/«6 channels» ✅; PERO «5.1»/«7.1» (impresión real cuando el
   layout es conocido) → 0 → B2.
k) ✅ Códecs/bitrates/URLs en registro/descriptores/defaults.ts (anclados y overridables);
   /input,/output,/medicion son constantes técnicas del protocolo del motor — JUSTIFICADO,
   pero duplicadas en 3 archivos sin fuente única (estrategias.ts:26-27, ffmpeg.ts:37-38,
   '/medicion' inline en L193, '/output' en el propio worker) → causa raíz de B1 → NB5.
l) ⚠️ Sin placeholders/TODO reales (solo falsos positivos del castellano «todo»), PERO hay
   una rama de protocolo MUERTA: el mensaje 'terminate' del worker (worker-source.ts:100-104)
   jamás se envía (MotorFfmpeg.cancelar usa worker.terminate() directo) y además hace
   ok() DESPUÉS de self.close() (ack probablemente no entregable) → NB3.

DEFECTOS BLOQUEANTES:
1. Divergencia planificador↔motor en nombres internos (estrategias.ts:119 sin fallback vs
   ffmpeg.ts:293 con `|| 'bin'`). Repro ejecutada: entrada «grabacion» (sin extensión,
   ADMITIDA por MIME en validarArchivoEntrada:38-40) → plan referencia «/input/p1.» y
   «/input/p2.» (copy y reencode) mientras el motor monta «/input/p1.bin». La sonda usa las
   rutas del motor (funciona) y el exec usa las del plan → «No such file or directory» →
   UNKNOWN_ENGINE_ERROR mal clasificado para una entrada válida admitida. El contrato
   MergePlan.args↔montaje no se cumple. Corrección: fuente única (p. ej. rutaInterna(i,n,ext)
   con el MISMO fallback en ambos) + test con entrada sin extensión.
2. Igualdad de canales «desconocido==desconocido» en la regla de copia (probe.ts:34 devuelve
   0 para layouts con nombre — verificado que ffmpeg 7.1.5 imprime «5.1» para WAV 6ch — y
   estrategias.ts:45 acepta 0===0). Repro ejecutada con la salida OGG documentada en
   extension.md: vorbis 5.1 + vorbis quad (mismos códec/tasa/bitrate, channels 0 ambos) →
   esCopiaElegible=true, plan «copy» → el demuxer concat copia muestras de 4 canales bajo
   un layout declarado de 6 → SALIDA CORROMPIDA SIN ERROR (peor clase). Corrección:
   exigir channels ≥ 1 para copia (o mapear '5.1'→6, '7.1'→8, 'quad'→4…) + test con la
   línea real «…, 48000 Hz, 5.1, s16, 4608 kb/s».
3. Límites declarados sin aplicar en el único camino entregado: mergeTracks no comprueba
   maxFileBytes por archivo (erroresDeLimites solo total; validarArchivoEntrada/seleccionarAdmisibles
   sin llamador runtime — F5 pendiente) y maxDurationMs está muerto (merge.ts:116 pasa
   durationMs:null → el chequeo de estimacion.ts:84-98 nunca dispara; sin re-chequeo
   post-sonda). Repro ejecutada: config maxFileBytes=1024 y maxDurationMs=10 s con dos
   entradas de 5000 B y sonda de 600 000 ms/pista → la unión COMPLETA sin error ni aviso.
   docs/extension.md:103-109 declara estos controles como validados → afirmación falsa
   (misma clase que el bloqueante 3 de FASE 2). Corrección: chequeo por-archivo en
   mergeTracks (o en erroresDeLimites) + re-chequeo de duración post-sonda (o reescribir la
   promesa del documento) + tests.

DEFECTOS NO BLOQUEANTES:
1. Fuga de estado tras exec fallido: /input queda montado y list.txt/salida parcial en MEMFS
   hasta el siguiente montar() (que desmonta antes) o dispose; sondear tampoco desmonta al
   fallar. WORKERFS no es RAM, pero los restos MEMFS sí. Añadir finally desmontar+delete.
2. Atribución errónea con corrupto en primera posición: verificado con ffmpeg real que si el
   primer archivo falla al abrir, los siguientes NO imprimen bloque Input → el motor los
   clasifica CORRUPT_FILE también (mensaje acusa a archivos sanos). La unión falla igual
   (correcto), pero el diagnóstico miente.
3. Rama de protocolo muerta 'terminate' (worker-source.ts:100-104): nadie la envía
   (cancelar usa worker.terminate()); el original @ffmpeg/ffmpeg 0.12.15 ni siquiera la
   tiene; y postMessage tras self.close() es un ack probablemente no entregable.
4. resolverUrlsCore con mode:'multi' explícito sin crossOriginIsolated no falla claro:
   devuelve URLs MT y el fallo llega tarde y crudo («SharedArrayBuffer is not defined» →
   WASM_LOAD_FAILED) sin atribuir a la falta de COOP/COEP que D-02 exige.
5. Constantes del layout del FS duplicadas sin fuente única (ver k) — causa raíz de B1.
6. docs/extension.md:37-38 referencia demo/selftest.html en presente (no existe aún; es
   Fase 6) y L93 nombra `engineRestartAfterBytes` (la clave real es engine.restartAfterBytes).
7. registrarFormatoSalida no valida coherencia interna del descriptor (argsCodificación vs
   sampleRateHz/canales/aformat) — límite declarable de la capa de registro.
8. '-nostdin','-y' redundantes (ya en DEFAULT_ARGS del core: ["./ffmpeg","-nostdin","-y"]) —
   inofensivo.
9. canalesDe «6 channels» sin test (cubierto solo mi repro); ROTO del test omite la línea
   intermedia real «Error opening input file <ruta>.» (el parser la ignora bien).

VERIFICADO POSITIVAMENTE (muestra): protocolo del worker fiel al core real en
load/exec/mount/unmount/write/read + eventos log/progress; mkdir+mount correcto (gotcha
upstream evitado); transferencia del buffer en read; write de string OK (UTF8 en el core);
WORKERFS streaming real; MT-revocación segura para 0.12.10 (verificado sobre el binario
core-mt real de la CDN anclada); carga diferida sin efectos en import; crearUnion valida
overrides (CONFIG_INVALID con typo) y lee el registro VIVO por llamada; registrarBuiltins
idempotente y re-registrable (repro propia); fundido: null→solo fade-in, cap 0.5×pista,
ms→s con 3 decimales (tests); grafo filter_complex con aformat por entrada y -map_metadata
-1 en ambas estrategias (tests); sonda multi-entrada en UNA ejecución (D-09); líneas de
probe.test.ts 100 % reales (verificadas contra ffmpeg 7.1.5 por el árbitro); guardas de
aborte de F3 presentes en carga/sonda/ejecución/medición; cero placeholders/persistencia.

NO VERIFICADO (declarado): el motor WASM real NO puede ejecutarse en Node (worker clásico +
blob + importScripts): streaming WORKERFS real, clasificación OOM real, progreso por time/μs,
cancelación terminate+recarga en caliente y modo MT quedan para la batería de navegador de
FASE 6 (D-12). Todo lo verificable offline se verificó contra los artefactos reales
(@ffmpeg/core 0.12.10 del node_modules y core-mt 0.12.10 de la CDN anclada).

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test 2>&1 | tail -8
 ✓ tests/unit/i18n.test.ts (6 tests) 5ms
 ✓ tests/unit/estimacion.test.ts (12 tests) 5ms

 Test Files  13 passed (13)
      Tests  166 passed (166)
   Start at  04:43:58
   Duration  3.85s (transform 268ms, setup 0ms, collect 545ms, tests 1.38s, environment 2ms, prepare 627ms)

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
(exit 0, sin salida de errores)

Repros mínimas de los bloqueantes (bun, importando el src real; ejecutadas por el árbitro):
- B1: planificarUnion(..., [entrada('grabacion'), entrada('otra')], ...) →
  listaConcat ["file '/input/p1.'","file '/input/p2.'"] vs motor monta ["/input/p1.bin","/input/p2.bin"].
- B2: esCopiaElegible([vorbis5.1(ch=0), vorbisQuad(ch=0)], ogg, {format:'ogg'}) → true;
  plan.strategy='copy' (salida corrupta silenciosa con -c copy); parser «5.1» → 0.
- B3: mergeTracks con limits.maxFileBytes=1024/maxDurationMs=10 s, entradas de 5000 B y
  sonda de 600 000 ms/pista → «RESULTADO: unión COMPLETADA sin error … warnings: []».

Stage Summary:
- VEREDICTO: FASE 4: RECHAZADA (3 defectos bloqueantes, todos de clase
  contrato-declarado-vs-código-real y demostrados por ejecución propia del árbitro; los
  tres son arreglos de pocas líneas + tests, nada requiere re-arquitectura).
- Condición de reapertura: corregir B1 (fuente única de rutas internas con el mismo
  fallback), B2 (canales desconocidos jamás elegibles para copia, o parseo de layouts con
  nombre) y B3 (límites por-archivo y duración aplicados en mergeTracks —con re-chequeo
  post-sonda— o promesa del documento reescrita para no afirmar lo que no se aplica), con
  tests de las tres repros; el árbitro re-ejecutará `bun run test`, `bun run typecheck` y
  las repros antes de aprobar.
- Los no bloqueantes (9 numerados) pueden cerrarse en FASE 5/6 salvo NB1/NB4, que conviene
  cerrar con la batería de navegador al quedar en el camino del motor real.

---
Task ID: 9
Agent: árbitro adversarial (Fase 4, re-auditoría)
Task: Verificación independiente de las correcciones de los 3 bloqueantes + no bloqueantes de la FASE 4

Work Log:
- Releídos los archivos corregidos (core/tracks.ts, core/estrategias.ts, core/merge.ts,
  engine/probe.ts, engine/ffmpeg.ts, engine/worker-source.ts, docs/extension.md) y los
  tests nuevos (estrategias 18, probe 10, merge 22).
- Verificación una a una:
  1. (B1) `extensionSegura` (tracks.ts:31-34) existe, con regex [a-z0-9]{1,8} → 'bin';
     la usan estrategias.ts:123 (rutas del plan) y ffmpeg.ts:344 (montaje) — fuente
     única real: la divergencia es estructuralmente imposible. Constantes RUTA_ENTRADA/
     RUTA_SALIDA exportadas de estrategias.ts y consumidas por ffmpeg.ts (una sola
     definición TS).
  2. (B2) canalesDe (probe.ts:28-39): 'quad'→4, /^(\d)\.(\d)$/ surround ('5.1'→6,
     '7.1'→8), 'N channels'→N, desconocido→0; esCopiaElegible (estrategias.ts:46-51)
     RECHAZA copia con tasa≤0 o canales≤0 (antes del loop y dentro) — «nunca a ciegas».
  3. (B3) merge.ts:118-125 aplica maxFileBytes POR ARCHIVO antes de tocar el motor
     (FILE_TOO_LARGE con nombre/máximo en details); merge.ts:193-205 aplica maxDurationMs
     TRAS la sonda cuando todas las duraciones se conocen (DURATION_TOO_LONG con total/
     máximo), con la excepción de duración desconocida documentada en comentario
     (L191-192) y coherente con estimacion.ts:96-98. docs/extension.md:109-111 actualizado
     con dónde se aplica cada límite.
  4. No bloqueantes: sondear()/ejecutar() desmontan en `finally` (ffmpeg.ts:101-107,
     187-193); re-sonda INDIVIDUAL de rutas sin bloque cuando la multi abortó (L127-145)
     con PROBE_FAILED si NINGUNA abrió y n>1 (L146-153) — lógica revisada por lectura para
     corrupto-primero/corrupto-último/único: correcta; case 'terminate' eliminado del
     switch del worker y del tipo MensajeAlWorker; ensureLoaded L70-76 lanza WASM_LOAD_
     FAILED TEMPRANO con consejo COOP/COEP para mode=multi sin crossOriginIsolated.
- Re-ejecutadas MIS repros originales (bun, src real), ahora como suite propia de 11
  aserciones: B1 listaConcat=['/input/p1.bin','/input/p2.bin'] y -i args idénticos ✅;
  extensionSegura adversarial (sin ext, mayúsculas, path-like 'a.b/c', dotfile '.mp3') ✅;
  B2 5.1(0)+quad(0)→copia RECHAZADA ✅, 6ch+4ch reales→rechazada ✅, 6ch+6ch→permitida
  (el parseo surround no destruye la copia legítima) ✅, parser línea real «5.1»→6 ✅;
  B3 FILE_TOO_LARGE ANTES de ensureLoaded (motor guardián nunca tocado) ✅, DURATION_TOO_
  LONG tras sonda ✅, duración desconocida NO bloquea (unión completada) ✅; NB4 multi sin
  COOP/COEP → WASM_LOAD_FAILED temprano con COOP/COEP en el mensaje ✅. (Dos FALLOS
  iniciales de la repro eran bugs de mi propio harness —aserción de estrategia y lambda
  existsSync—, corregidos y documentados; el código auditado los pasó desde el principio.)
- Tests/typecheck ejecutados por el árbitro (salidas abajo): 170/170 (antes 166; delta
  exacto: merge +2 límites, estrategias +1 canales-desconocidos, probe +1 surround) y
  typecheck 0 errores. Ningún test existente debilitado (los 166 previos siguen).

Estado de los 3 bloqueantes:
- B1 (divergencia planificador↔motor): RESUELTO y VERIFICADO por repro propia (rutas
  canónicas idénticas en plan y montaje por construcción). Falta un test de regresión en
  la SUITE (residual 2, no bloqueante: la protección es estructural —misma función— y el
  typecheck la mantiene).
- B2 (copia a ciegas con canales desconocidos): RESUELTO y VERIFICADO (repro + tests
  estrategias.test.ts:56-60 y probe.test.ts:160-170; el surround legítimo 6ch+6ch sigue
  siendo copiable — la corrección no destruye el caso válido).
- B3 (límites declarados sin aplicar): RESUELTO y VERIFICADO (repro con motor guardián:
  el límite por archivo dispara SIN cargar el motor; DURATION_TOO_LONG post-sonda;
  excepción por dato desconocido documentada; tests merge.test.ts:295-316). La promesa
  de docs/extension.md ahora coincide con el código.

RESIDUALES (bloqueantes: NINGUNO):
No bloqueantes:
1. worker-source.ts:57 — la guarda `m.tipo !== 'terminate'` conserva la mención textual
   'terminate' (case y tipo TS eliminados; la condición es inalcanzable). La afirmación
   «rama terminate eliminada del worker» se cumple en el switch, no en la guarda.
2. Sin test de regresión en la SUITE para B1 (contrato listaConcat/p1.bin con entrada
   sin extensión); cubierto hoy solo por la repro del árbitro. Recomendar un
   `it('rutas internas canónicas: sin extensión → p1.bin')` en estrategias.test.ts.
3. docs/extension.md:37-38 referencia demo/selftest.html en presente — demo/ está VACÍO
   (verificado por el árbitro); es Fase 6. Reformular en futuro o crear el stub.
4. docs/extension.md:93 nombra `engineRestartAfterBytes`; la clave real es
   `engine.restartAfterBytes` (sigue de la ronda 1).
5. '/output' sigue existiendo como literal en la cadena del worker (mkdir) — inevitable
   (cadena JS sin imports); declarable como límite técnico del protocolo.
6. Residuos de FS menores: list.txt permanece en MEMFS tras ejecutar (se sobrescribe);
   /input y /medicion pueden quedar como directorios vacíos si el mount falla tras el
   mkdir del worker. KBs; cerrar con la batería de navegador.
7. El fallo temprano de mode=multi sin COOP/COEP usa WASM_LOAD_FAILED (RETRYABLE):
   un error de CONFIGURACIÓN persistente queda marcado «reintenable». Matiz de taxonomía
   (un código NO_RETRY propio sería más honesto); el mensaje sí es accionable.
8. merge.ts:127 sigue llamando erroresDeLimites con durationMs:null → su rama
   DURATION_TOO_LONG es ahora código redundante (el chequeo real está en L193-205);
   confusión potencial para el lector, no para el comportamiento.

NO VERIFICADO (declarado, igual que en la ronda 1): re-sonda individual, desmontaje en
finally, streaming WORKERFS, clasificación OOM, progreso time/μs, cancelación terminate
+ recarga y modo MT con el core REAL — el wasm no corre en Node; batería de navegador
Fase 6 (D-12). La lógica de la re-sonda y del finally fue revisada por lectura.

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test 2>&1 | tail -6
 Test Files  13 passed (13)
      Tests  170 passed (170)
   Start at  05:02:28
   Duration  4.29s (transform 278ms, setup 0ms, collect 575ms, tests 1.65s, environment 2ms, prepare 662ms)

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
(exit 0, sin salida de errores)

Detalle por fichero (mismo run): atributos 10 · config 23 · errors 10 · estimacion 12 ·
estrategias 18 · i18n 6 · merge 22 · probe 10 · reducer 18 · registry 13 · tracks 13 ·
utils 6 · validation 9 = 170.

Stage Summary:
- VEREDICTO: FASE 4: APROBADA. Los 3 bloqueantes están RESUELTOS y verificados por
  ejecución propia del árbitro con las repros originales (todas en verde) y los tests
  nuevos de la suite (170/170, delta exacto +4 sin debilitar ninguno existente);
  typecheck estricto limpio.
- Correcciones de no bloqueantes verificadas: desmontaje en finally (sondear/ejecutar),
  re-sonda individual con PROBE_FAILED si nada abre (lógica correcta por lectura; runtime
  en F6), fallo temprano y accionable de multi sin COOP/COEP, constantes FS compartidas,
  surround/multi-canal parseado y testeado.
- Residuales no bloqueantes: 8 numerados (ninguno bloqueante); los que tocan el camino
  del motor real (6, y la verificación runtime de la re-sonda) se cierran con la batería
  de navegador de Fase 6; los doc (3, 4) y el test de regresión de B1 (2) conviene
  cerrarlos antes del cierre del proyecto.
- Sigue NO VERIFICADO (sin navegador): todo lo del párrafo homónimo de arriba.
---
Task ID: 11
Agent: árbitro adversarial (Fase 5)
Task: Auditoría adversarial INDEPENDIENTE de la FASE 5 (renderizado dinámico y listas del Web Component <audio-merger>)

Work Log:
- Leídos íntegros: worklog (Task 1–10 + árbitros F1–F4), los 7 archivos auditados
  (src/ui/audio-merger-element.ts 1121 líneas, estilos.ts, metadatos.ts, lista-virtual.ts,
  core/reducer.ts, tests/ui-elemento.test.ts, docs/rendering.md) y soporte
  (i18n/es.ts + index.ts, core/tracks.ts, config/defaults.ts, config/atributos.ts,
  config/validate.ts, core/eventos.ts, core/merge.ts, engine/ffmpeg.ts, docs/decisions/D-06,
  docs/api.md, vitest.config.ts). Nada del proyecto fue modificado (sondas en
  /home/z/sondas-arbitro/, fuera del repo).
- EJECUTADO (salidas reales pegadas abajo): `bun run test` → 183/183 aserciones pasan
  PERO exit code 1 con «Errors 12 errors» (12 unhandled rejections); `bun run typecheck`
  → exit 0 sin errores.
- Sonda adversarial jsdom (vitest con config propia fuera del repo, importando el src
  real con rutas absolutas): P0 atasco 'analyzing' + rechazo no manejado; P1a–P1d fugas
  de interpolación con details REALES de tracks.ts/atributos.ts/merge.ts/ffmpeg.ts;
  P2 dos File con mismo nombre+tamaño; P3 doble merge() con aviso abierto; P4 foco tras
  eliminar; P5 clientHeight; P6 reutilización de nodos; P7 extremos deshabilitados.
- Sonda en NAVEGADOR REAL (Chromium vía agent-browser, vite dev del propio repo con
  cacheDir/port fuera del repo, CORS abierto, página sobre el propio origen de vite):
  importado el componente REAL y añadidas 55 pistas sintéticas → medición de
  clientHeight/scrollTop/overflow/filas en DOM antes y después de scroll de documento;
  además calcularVentana con total 0 y scrollTop obsoleto.
- Sonda reducer pura (bun): LIMPIAR_LISTA/REINICIAR durante job running → qué pasa con
  JOB_PROGRESO/JOB_COMPLETADO/segundo JOB_INICIADO.
- Greps: status 'invalid'/errorCode NUNCA se asignan (solo types.ts + lecturas en
  audio-merger-element.ts:845/849); ejecutarUnion(true) NUNCA se llama (trasAviso muerto);
  TODO/FIXME/placeholder en auditados: limpio; acciones 'ERROR' solo en aplicarAtributos
  (CONFIG_INVALID) → 'cancelled' inalcanzable.
- Verificación estática cruzada: refs data-ref del template completas (18/18); revoke en
  metadatos.ts por todos los caminos con timeout; guarda de completarDuración tras
  remove/clear (porId.has); input reutilizado con value='' tras captura SÍNCRONA de la
  FileList (Array.from antes del primer await); dragover preventDefault en zona;
  JOB_INICIADO (reducer.ts:141) anula resultado → el revoke del éxito (element:406) es
  código muerto; disconnectedCallback aborta+revoca.

CHECKLIST FASE 5 (veredicto por punto):
a) ✅ Claves estables: filas Map<id, HTMLLIElement> (element:75; reconciliación 660-667
   con borrado de huérfanas), crearFila solo para ids nuevos; ids UUID (crearId) y
   ANADIR_PISTAS fail-fast ante duplicados (reducer.ts:77-79). VERIFICADO por ejecución:
   tras moveTrack los 3 nodos de fila son los MISMOS objetos (sin recrear) y el orden
   cambió. El índice jamás se usa como clave.
b) ❌ Umbral configurable ✓ (element:648 `orden.length > threshold`, default 50 en
   defaults.ts:115; rowHeightPx 72 respetado: height=3960px con 55 pistas) y coste
   declarado ✓ (D-06: DnD desactivado + nota lista.virtual + mango aria-hidden). PERO la
   virtualización es INERTE: demostrado en Chromium real con el componente real — 55
   pistas → 55 filas en el DOM, clientHeight del UL = 3960 (= altura total sintética),
   scrollTop = 0 permanente, onscroll jamás dispara, tras scroll de documento siguen las
   55 filas. El UL no es contenedor de scroll (estilos.ts sin overflow/max-height para
   .am-lista): «solo se montan las filas visibles ± margen» (D-06:7-8) y «O(ventana)
   virtual» (rendering.md:17) son FALSOS. Se paga el coste (DnD off) sin el beneficio.
   (En jsdom parece virtualizar por artefacto: clientHeight=0 → fallback 420 → 10 filas.)
c) ⚠️→❌ Duración desconocida ✓ diferenciada de 'analizando' (meta element:833-837);
   nombre vacío ✓ ('(sin nombre)'); error temporal WASM ✓ (panel + Reintentar por
   RETRYABLE_CODES, defaults.ts:146); config ✓ (panel con code) PERO con fuga {detalle}
   (ver h); OOM ✓ (consejo accionable es.ts:89-90). FALLO: la fila «inválido» (borde
   rojo + chip + title con código, rendering.md:26) es INALCANZABLE: ningún código
   asigna status:'invalid' ni errorCode (grep: 0 escrituras); MIME desconocido se rechaza
   en addFiles (evento, sin fila) y corrupto solo aparece como JOB_ERROR global. Rama
   muerta + afirmación falsa de rendering.md.
d) ⚠️→❌ idle ✓, empty ✓ ('lista.vacia'), loading/analyzing ✓ (por fila + etapas del job
   con 'estado.motor/sonda/uniendo/validando'), error ✓ (panel), success ✓ (panel de
   resultado con avisos y preescucha). FALLO: cancelled INALCANZABLE: el catch de
   USER_CANCELLED usa JOB_CANCELADO que borra error (reducer.ts:165-166) y la acción
   'ERROR' solo se usa con CONFIG_INVALID (element:123/132) → 'estado.cancelado'
   (element:898) y `get state`==='cancelled' jamás ocurren. Verificado por ejecución:
   tras cancelar desde el aviso, estado-texto='' y estado.error=null. rendering.md:31-32
   («todos presentes en la UI») es falso para cancelled.
e) ✅ Re-render por regiones (herramientas/lista/estado/resultado/error); onProgress solo
   toca renderizarEstado (element:411-417) sin tocar la lista; filas reutilizadas
   (verificado). Matiz declarado: renderizarLista re-appenda O(N) por llamada.
f) ⚠️ Botones ↑/↓/✕ SIEMPRE presentes en toda fila (crearFila) con extremos
   deshabilitados VERIFICADO (fila0 subir.disabled=true, fila1 bajar.disabled=true);
   aria-live="polite" para progreso/anuncios ✓ (estado-texto role=status; anuncios
   role=status); foco tras mover en el mismo botón ✓ (element:824); ARIA en DnD parcial
   (anuncio tras soltar ✓; aria-roledescription genérico «Pista N»). FALLOS: foco tras
   eliminar cae en fila ARBITRARIA (devolverFoco element:1061 usa `findIndex(id => id >
   idEliminada)` — comparación lexicográfica de UUIDs aleatorios, no posición: verificado,
   foco en fila 0 cuando la siguiente real era la segunda) y el diálogo de aviso no tiene
   focus-trap (Escape solo con foco dentro; Tab escapa al botón «Unir» aún habilitado —
   puerta de entrada del bloqueante 4).
g) ❌ EJECUTADO por el árbitro: 183/183 aserciones en verde PERO `bun run test` TERMINA
   CON CÓDIGO 1 («Errors 12 errors»: 12 unhandled rejections desde metadatos.ts:10 vía
   completarDuracion). La afirmación del Task 10 («183/183 pasando; typecheck 0») oculta
   la suite roja. typecheck: exit 0 sin errores (salidas reales abajo).
h) ❌ Fugas de interpolación en texto visible (verificado por ejecución, 6 códigos):
   UNSUPPORTED_FORMAT → «Formato no admitido: {formato}» (anuncio a11y del error de
   usuario MÁS común), CONFIG_INVALID → «Configuración inválida: {detalle}» (panel de
   error), TOO_MANY_TRACKS → «Se alcanzó el máximo de {n} pistas.», DURATION_TOO_LONG →
   «La duración total ({duracion})…» (details reales de merge.ts), PROBE_FAILED → «No se
   pudo analizar {nombres}.» (ambas variantes de details), CORRUPT_FILE multi-pista →
   ««{nombre}» está dañado…» (nombres plural vs {nombre} singular). Causa: el mapeo
   details→params de mensajeDeError/consejoDeError (element:1075-1100) no cubre los
   details que realmente producen tracks.ts/atributos.ts/merge.ts/ffmpeg.ts; t() deja el
   token crudo. Los literales castellanos técnicos del elemento (mensajes MergeError)
   siguen la convención del core (se traducen por código) — no defecto.
i) ⚠️ Sin TODO/FIXME/placeholders (grep limpio). PERO dead code: parámetro trasAviso
   nunca invocado con true (grep 0; el aviso no se re-muestra porque la MISMA invocación
   continúa tras Continuar); revoke del éxito (element:406) muerto (JOB_INICIADO ya anuló
   resultado en reducer.ts:141); rama 'invalid' (element:845-855) inalcanzable; campo
   avisoPendiente jamás renderizado; indiceDesdeY y Ventana.alturaTotal/
   desplazamientoSuperior exportados sin consumidor interno; ICONOS.subirDeshabilitado
   duplicado exacto de ICONOS.subir (element:37-38).

ATAQUES ADVERSARIALES EJECUTADOS (resumen):
- addFiles con dos File de MISMO nombre y MISMO tamaño y contenido distinto → ambas
  pistas quedan asociadas al MISMO File (archivos.get(idA)===archivos.get(idB), ejecutado)
  → la unión monta el primer contenido dos veces y pierde el segundo EN SILENCIO.
- FileList de input reutilizado: SEGURO (Array.from síncrono antes del primer await;
  value='' después). crearId: colisión despreciable + fail-fast en el reducer.
- completarDuracion: guarda correcta tras QUITAR_PISTA y tras LIMPIAR_LISTA
  (porId.has(id) tras el await) — PERO sin .catch: cualquier rechazo de leerDuracion
  (como el de URL.createObjectURL) deja la pista atascada en 'analyzing' para siempre
  con rechazo no manejado (bloqueante 1).
- merge() doble con aviso abierto → 1ª promesa colgada para siempre (bloqueante 4);
  JOB_IN_PROGRESS solo cubre la ventana post-JOB_INICIADO; aviso mostrado UNA vez por
  invocación (efecto correcto, parámetro vestigial); URL del resultado anterior NO
  revocada al re-unir por API (código muerto + fuga); disconnectedCallback aborta ✓
  PERO también dispara al MOVER el elemento en el DOM (no bloqueante 1).
- Virtual: onscroll reasignado (sin fuga) pero jamás dispara; total 0 seguro
  (calcularVentana → {0,0}); altura fija respeta rowHeightPx (3960=55×72, navegador
  real); filas fuera de ventana se desmontan y quedan en el Map — lógica presente pero
  JAMÁS EJERCITADA en navegador real porque la ventana siempre cubre toda la lista.
- accionFila: foco re-puesto en el mismo botón tras re-append ✓; subir disabled en
  primera fila ✓ (ejecutado).
- Template: 18 refs data-ref verificadas una a una — completas, sin tags rotos.
- dragover preventDefault en zona ✓ (drop de archivos del sistema permitido por código;
  el arrastre físico queda «no verificado», ver abajo).
- metadatos.ts: revokeObjectURL en los TRES caminos (metadata/error/timeout) vía
  terminar() centralizado; doble llamada segura (clearTimeout + revoke idempotentes).
  PERO puede RECHAZAR (contrario a su JSDoc «null declarado») si createObjectURL falta.
- docs/rendering.md vs código: umbral/altura/overscan/DnD-off/re-renders/a11y coinciden;
  NO coinciden: «solo filas visibles montadas» (falso), O(ventana) (falso), fila invalid
  (inalcanzable), cancelled visible (inalcanzable), «foco a la fila siguiente» (fila
  arbitraria).

DEFECTOS BLOQUEANTES:
1. Suite ROJA + metadatos.ts viola su contrato + pista brickeada en silencio:
   `bun run test` acaba con exit 1 por 12 unhandled rejections (TypeError: URL.
   createObjectURL is not a function) lanzadas dentro del executor de leerDuracion
   (metadatos.ts:10) y propagadas por `void this.completarDuracion(...)` (element:231).
   Consecuencia verificada por ejecución: la pista queda ATASCADA en 'analyzing' para
   siempre (nunca 'ready' → excluida de toda unión, SIN error visible). En navegador real
   createObjectURL existe, pero cualquier throw de esa ruta brickea la pista igual (y el
   JSDoc de metadatos.ts promete «nunca una cifra inventada… null declarado», no un
   rechazo). Corrección: try/catch en el executor (resolver null) y/o .catch en
   completarDuracion que fije status 'ready' + durationMs null + test.
2. Virtualización INERTE demostrada en navegador real (Chromium + componente real):
   con 55 pistas (> umbral 50) se montan las 55 filas; clientHeight del UL = 3960 px (=
   altura total sintética), scrollTop = 0 permanente, onscroll jamás dispara, overflow
   computado 'visible'. El contenedor nunca scrollea (el documento sí) → ventanaVisible
   cubre siempre toda la lista. D-06:7-8 («solo se montan las filas visibles ± margen») y
   rendering.md:17 («O(ventana)») son afirmaciones falsas; el coste (DnD desactivado +
   aviso «usa ↑/↓») sí se cobra. Corrección: hacer de .am-lista un contenedor de scroll
   real (overflow:auto + altura/max-height acotada, p. ej. viewport del componente) y
   medir contra él; test con >threshold filas y clientHeight acotado.
3. Fugas de interpolación i18n en texto visible (6 códigos, ejecutadas): tokens crudos
   {formato}, {detalle}, {n}, {duracion}, {nombres}, {nombre} llegan al usuario (anuncio
   a11y de pista rechazada y panel de error). Incluye el flujo de error más común
   (archivo no soportado) y el CONFIG_INVALID con atributo citado que el propio test de
   la fase cubre (solo comprueba el code, no el texto). Corrección: completar el mapeo
   details→params (formato/extension/mimeType de UNSUPPORTED_FORMAT; n de TOO_MANY_
   TRACKS vía maximo; duracion formateada de DURATION_TOO_LONG; nombres de PROBE_FAILED;
   nombre singular del CORRUPT_FILE multi; detalle de CONFIG_INVALID-atributo) + tests
   por código con los details reales de los constructores.
4. Doble merge() con el aviso abierto → la PRIMERA promesa queda colgada PARA SIEMPRE
   (ejecutado): la ventana aviso→JOB_INICIADO no está cubierta por la guarda
   JOB_IN_PROGRESS (element:335 solo consulta estado.job, aún null) y la segunda llamada
   SOBRESCRIBE this.avisoResolver (element:358) dejando la primera promesa sin resolver
   jamás. Alcanzable por API pública (merge() documentado) y POR TECLADO desde la UI (el
   diálogo no tiene focus-trap y el botón «Unir» sigue habilitado detrás). Corrección:
   bandera/guarda de aviso abierto (o resolver la promesa anterior al abrir una nueva) +
   test.
5. Asociación pista↔File por nombre+tamaño (element:224): dos archivos con el mismo
   nombre y tamaño quedan ligados al MISMO File (ejecutado: archivos.get(idA)===
   archivos.get(idB) con contenidos distintos) → la unión monta el primer contenido dos
   veces y pierde el segundo EN SILENCIO (clase «unión silenciosamente incorrecta», la
   peor según D-04/plan). Corrección: emparejar por posición durante el bucle de admisión
   (admitidas conserva el orden de `archivos`) + test con dos Files iguales en nombre y
   tamaño.
6. clear()/reset() durante una unión desincronizan el ciclo de vida (ejecutado sobre el
   reducer real): LIMPIAR_LISTA/REINICIAR ponen job:null con la unión REAL en vuelo → el
   progreso tardío se ignora (guarda de JOB_PROGRESO), JOB_COMPLETADO se DESCARTA en
   silencio (resultado jamás visible, URL filtrada, merge() resuelve al llamador) y un
   SEGUNDO JOB_INICIADO queda PERMITIDO → dos mergeTracks concurrentes comparten el mismo
   MotorFfmpeg y el mismo punto de montaje /input (colisión de motor). La UI no lo ofrece
   (Vaciar solo se pinta sin job), pero la API pública (api.md:61-62) no lo prohíbe y el
   estándar del proyecto es fail-fast sin reemplazo silencioso (plan §6). Corrección:
   abortar el controlador y/o lanzar JOB_IN_PROGRESS en clear()/reset() con job running
   + test.
7. Estados declarados inalcanzables (misma clase que el bloqueante 3 de FASE 2 —
   afirmación falsa sobre el código): la fila 'invalid' (rendering.md:26) jamás ocurre
   (0 escrituras de status:'invalid'/errorCode en src) y 'cancelled' jamás es visible
   (rendering.md:31-32; JOB_CANCELADO borra error y la acción 'ERROR' solo se usa con
   CONFIG_INVALID) — el usuario cancela y la barra de estado queda VACÍA (verificado).
   Corrección: o implementar (marcar pistas fallidas tras PROBE/CORRUPT en el catch;
   fijar error USER_CANCELLED en el estado al cancelar) o reescribir rendering.md.

DEFECTOS NO BLOQUEANTES:
1. disconnectedCallback (element:99-103) aborta la unión y revoca la URL del resultado
   también al MOVER el elemento dentro del documento (remove+insert dispara
   disconnected+connected): tras re-conectar, resultado apunta a una URL revocada
   (preescucha/descarga rotas) y el job en curso quedó cancelado sin intervención.
   Fix clásico: diferir con microtask/timer y comprobar isConnected.
2. Fuga de object URLs al re-unir/reintentar por API: JOB_INICIADO (reducer.ts:141) y el
   REINICIAR del botón Reintentar (element:995) sueltan `resultado` sin revoke; el revoke
   del éxito (element:406) es código muerto porque JOB_INICIADO ya lo anuló. reset()/
   clear()/disconnect sí revocan. Caminos: merge() doble por API; retry con resultado
   previo (ERROR no borra resultado).
3. devolverFoco (element:1061) elige fila por comparación lexicográfica de UUIDs
   (`id > idEliminada`) — el foco cae en una fila arbitraria, no en la «fila siguiente»
   que promete rendering.md:51-52 (ejecutado: foco en fila 0 con la siguiente real en
   posición 2). Fix: índice posicional capturado antes de QUITAR_PISTA.
4. Diálogo de aviso sin focus-trap y Escape solo con foco dentro (element:1038-1046):
   aria-modal declarado pero no impuesto; además habilita el bloqueante 4 por teclado.
5. Drop de un archivo del sistema sobre una FILA (no sobre la zona): el handler de fila
   hace preventDefault y retorna (element:787-795); lista y zona son hermanas → el
   evento no llega a la zona y el archivo se ignora en silencio. UX menor.
6. aplicarAtributos recrea MotorFfmpeg (element:153) en CADA cambio de atributo (p. ej.
   theme a mitad de job): el job conserva el motor antiguo (capturado en el ctx), pero
   se desperdicia instancia y el worker cargado queda a merced del GC.
7. Dead code menor: trasAviso (element:347) nunca true; avisoPendiente nunca renderizado;
   indiceDesdeY y Ventana.alturaTotal/desplazamientoSuperior (lista-virtual.ts) sin
   consumidor interno; ICONOS.subirDeshabilitado duplicado exacto de subir (37-38).
8. `alturaContenedor: lista.clientHeight || 420` (element:734): 420 mágico sin
   justificación en comentario (convención de defaults.ts:2-4).
9. renderizarHerramientas reconstruye el toolbar completo (innerHTML='') en cada
   completarDuracion: el foco de un select de formato abierto se pierde si llegan
   duraciones mientras se usa. Acotado a la región (compatible con rendering.md §4).
10. La suite de UI no cubre NINGUNO de los puntos nucleares de la fase: sin test de
    virtualización (>50 pistas), de foco tras eliminar, del aviso de estimación, de
    cancelación ni del panel de error de unión (12 tests de humo) — los defectos 2-7
    eran invisibles para la suite, y la propia suite está roja por el defecto 1.

NO VERIFICADO (con repro):
- DnD físico con ratón (arrastrar fila sobre fila) y drop físico de archivos del sistema
  sobre la zona: requiere navegador interactivo; repro Fase 6 con agent-browser
  (drag del mango a otra fila + upload). La lógica DnD fue revisada por lectura y los
  anuncios probados en jsdom.
- Motor WASM real dentro del componente (carga, progreso, cancelación en caliente,
  preescucha/descarga): demo/ vacía y dist/ inexistente (deuda F6); repro: build + demo
  selftest (D-12).
- Scroll «correcto» post-fix de la virtualización: hoy no puede observarse porque el UL
  nunca scrollea (eso ES el bloqueante 2); la medición real se hizo con scroll de
  documento.

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test 2>&1 | tail -8
 Test Files  14 passed (14)
      Tests  183 passed (183)
      Errors  12 errors
   Start at  05:25:39
   Duration  5.02s (transform 432ms, setup 0ms, collect 769ms, tests 1.78s, environment 294ms, prepare 727ms)

error: script "test" exited with code 1

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
(exit 0, sin salida de errores)

Sonda jsdom (vitest, src real) — extracto:
INFO | status tras 200 ms = 'analyzing' (ready si la duración se resolviera)
OK  | la pista queda ATASCADA en 'analyzing' (nunca ready → nunca unible) = true
INFO | anuncio = "Pista rechazada: raro.xyz — Formato no admitido: {formato}"
INFO | panel = "Configuración inválida: {detalle}Configuración inválida: {detalle}Revisa los atributos…code: CONFI"
INFO | anuncio = "Pista rechazada: c.mp3 — Se alcanzó el máximo de {n} pistas."
INFO | DURATION_TOO_LONG(details reales) = "La duración total ({duracion}) supera el máximo configurado."
INFO | PROBE_FAILED invariante(details reales) = "No se pudo analizar {nombres}."
INFO | contenidos distintos: por construcción (0x41 vs 0x42); archivos.get(idA) === archivos.get(idB) = true
INFO | merge() #2 → rechazada:USER_CANCELLED
INFO | merge() #1 → PENDIENTE PARA SIEMPRE
INFO | tras cancelar: evento cancelled×1; estado-texto='' | estado.error=null
INFO | focus() recibió: BUTTON[aria-label='Quitar a.mp3'] fila=763e01f4 | la fila siguiente real es '420ee8af'
INFO | nodos antes=3, después=3, reutilizados=3 (reconciliación por id correcta)
INFO | fila0: subir.disabled=true bajar.disabled=false | fila1: subir.disabled=false bajar.disabled=true

Sonda navegador real (Chromium, componente real vía vite dev, 55 pistas):
{"pistas":55,"state":"idle","filasEnDom":55,"listaStyleHeight":"3960px","clientHeightReal":3960,"scrollTop":0,"overflowComputado":"visible","notaVirtual":"Lista larga: reordena con los botones ↑ ","ventanaCalculada":{"visibles":55,"fin":55}}
tras window.scrollTo(0,999999): {"filasEnDomTrasScroll":55,"scrollTopLista":0,"scrollTopDocumento":4815}
calcularVentana total=0 → {"inicio":0,"fin":0,…} (sin explosión)

Sonda reducer pura (bun):
1) job corriendo: j1 running
2) tras LIMPIAR_LISTA: job=null, porId=0, resultado=null
3) progreso de j1: IGNORADO (no-op) — la barra se congela
4) JOB_COMPLETADO de j1: IGNORADO — el RESULTADO SE DESCARTA en silencio
5) tras REINICIAR: job=null
6) SEGUNDO JOB_INICIADO con j9 en vuelo: PERMITIDO → j10

Stage Summary:
- VEREDICTO: FASE 5: RECHAZADA (7 defectos bloqueantes, todos demostrados por ejecución
  propia del árbitro — incluida una verificación en Chromium real con el componente real
  para la virtualización—; ninguno requiere re-arquitectura: son arreglos de pocas líneas
  + tests).
- Bloqueantes: (1) suite roja (exit 1, 12 unhandled rejections) por leerDuracion que
  RECHAZA pese a su contrato, dejando pistas atascadas en 'analyzing' en silencio;
  (2) virtualización inerte en navegador real (55/55 filas montadas, UL sin scroll, coste
  cobrado sin beneficio, D-06/rendering.md falsos); (3) tokens crudos de i18n en 6
  códigos de error visibles; (4) doble merge() con aviso abierto deja la primera promesa
  colgada para siempre (ventana sin guarda + avisoResolver sobrescrito); (5) asociación
  de File por nombre+tamaño → unión silenciosamente incorrecta con duplicados; (6)
  clear()/reset() a mitad de unión descartan el resultado en silencio y permiten dos
  mergeTracks concurrentes sobre el mismo motor; (7) estados 'invalid' y 'cancelled'
  declarados en rendering.md e inalcanzables en el código.
- Verificado positivamente (ejecutado): reconciliación por id con reutilización de nodos,
  extremos ↑/↓ deshabilitados, refs del template completas, metadatos con revoke en todos
  los caminos y timeout limpio, guarda de completarDuración tras remove/clear, input
  reutilizado con captura síncrona de FileList, aria-live/progressbar, dragover
  preventDefault, template sin XSS (textContent en todo lo interpolado), typecheck
  estricto limpio.
- No verificado (declarado): DnD físico con ratón, motor WASM real y preescucha —
  quedan para la batería de navegador de FASE 6 (demo/ y dist/ aún no existen).
- Condición de reapertura: corregir B1–B7 con tests discriminantes; el árbitro
  re-ejecutará `bun run test` (exigiendo exit 0 y cero unhandled errors), `bun run
  typecheck`, y las sondas: interpolación por código con los details reales, doble
  merge() con aviso, dos Files homónimos homotamaño, virtualización en navegador real
  con filas montadas < total y scroll del contenedor, y estados invalid/cancelled
  visibles.
---
Task ID: 11
Agent: árbitro adversarial (Fase 5, re-auditoría)
Task: Verificación independiente de las correcciones de los 7 bloqueantes + no bloqueantes de la FASE 5

Work Log:
- Releídos íntegros los archivos corregidos: src/ui/audio-merger-element.ts (1121→1219 líneas),
  src/ui/metadatos.ts (guarda de entorno + try/catch + flag resuelto), src/ui/lista-virtual.ts
  (Ventana reducida a inicio/fin; visibles ≥1), src/core/reducer.ts (JOB_CANCELADO fija
  USER_CANCELLED), src/config/defaults.ts (+maxHeightPx 480), src/config/validate.ts
  (maxHeightPx ≥ 120), src/ui/estilos.ts, tests/ui-elemento.test.ts (12→17 tests),
  docs/rendering.md (maxHeightPx, invalid alcanzable, cancelled visible).
- EJECUTADO (salidas reales abajo): `bun run test` → 188/188 en 14 ficheros, EXIT 0, SIN
  línea «Errors» (antes exit 1 con 12 unhandled rejections); `bun run typecheck` → exit 0.
- Re-lanzadas MIS repros originales (sonda jsdom con vitest + config propia fuera del repo,
  importando el src real): P0 atasco, P1a–P1d fugas i18n (con details reales de
  tracks/atributos/merge/ffmpeg), P2 homónimos, P3 doble merge con aviso, P4 foco tras
  eliminar (posicional + última fila), P5–P7 virtualización/reconciliación/extremos, y sondas
  nuevas: R-P9b marcarPistasInvalidas+renderizarLista (camino real del catch), R-P12 B6
  dirigido (clear/reset durante job), R-P13 JOB_CANCELADO, R-P14 variantes de details reales,
  R-P15 panel CONFIG_INVALID real, N1/N2 regresiones del espaciador, R-P10 trampa de foco.
- RE-LANZADA la sonda en NAVEGADOR REAL (Chromium vía agent-browser + vite dev del repo con
  cacheDir/port fuera del repo): 55 pistas sintéticas → medición de espaciador
  (style vs getBoundingClientRect vs flexShrink), scrollHeight, ratchet de scroll (14
  iteraciones scrollTop=999999), scroll a mitad, rueda, y clear() con lista virtualizada.
- Greps: parseAtributo importado SIN uso (element:16); ICONOS.subirDeshabilitado sigue
  DECLARADO y sin uso (element:36 — el claim «icono duplicado eliminado» solo quitó el uso);
  avisoPendiente sin consumidor en la UI; claves i18n sin uso (app.cargando, toolbar.calidad,
  estado.avisos, misc.cerrar, misc.entendido); TODO/FIXME/placeholder: limpio.

Estado de los 7 bloqueantes (verificado por ejecución propia del árbitro):
- B1 (suite rota + pistas atascadas en 'analyzing'): RESUELTO — leerDuracion jamás rechaza
  (guarda de entorno metadatos.ts:11-15, try/catch 25-30, flag resuelto 20-23) y
  completarDuracion envuelve (element:499-510). EJECUTADO: jsdom → status 'ready',
  durationMs null, state 'idle', fila «duración desconocida»; suite exit 0 sin «Errors»;
  en Chromium real las 55 pistas sintéticas quedan 'ready' con duración null.
- B2 (virtualización inerte): PARCIAL → MANTIENE carácter bloqueante. Lo que funciona
  (verificado en Chromium real): maxHeight 480px, overflowY auto, clientHeight 480, 11
  filas montadas de 55, nota virtual, espaciador con style.height=3960px. Lo que NO
  funciona: el espaciador es un li EN FLUJO dentro de .am-lista{display:flex} con
  flex-shrink:1 por defecto → se ENCOJE a 480px (getBoundingClientRect=480 con
  style=3960; flexShrink computado '1') → scrollHeight=792 (11 filas absolutas), NO 3960.
  Consecuencia EJECUTADA: el scroll interno está ACOTADO a la ventana montada; saltar al
  final (arrastrar el scrollbar / End / scrollTop=3480) queda CLAMPADO en 312px y solo
  avanza por RATCHEL (verificado: 11 iteraciones scroll-to-bottom para llegar a la fila 55;
  drag del scrollbar se ESTANCA en el primer clamp; la geometría del scrollbar engaña todo
  el tiempo). D-06 («contenedor con altura total sintética») y rendering.md:14-16 («un
  espaciador da la altura total») quedan refutados en LAYOUT real; el test jsdom pasa solo
  porque jsdom no hace layout (afirma style.height, no la altura renderizada). Fix de una
  línea: flex-shrink:0 en el espaciador (o contenedor de scroll no-flex).
- B3 (fugas de interpolación i18n): PARCIAL → MANTIENE carácter bloqueante. Corregidas y
  verificadas: UNSUPPORTED_FORMAT de addFiles («Formato no admitido: xyz»), TOO_MANY_TRACKS
  («máximo de 2 pistas»), DURATION_TOO_LONG («2:00:00»), FILE_TOO_LARGE, INVALID_OPTIONS,
  CONFIG_INVALID de resolverConfig (problemas). SIGUEN FILTRANDO tokens en caminos REALES
  (7 variantes, ejecutadas contra los details que producen los constructores):
  · CONFIG_INVALID de parseAtributo (atributo ilegible/vacío/enum — atributos.ts:67-113,
    details {atributo, recibido…}): panel «Configuración inválida: {detalle}». Es MI REPRO
    ORIGINAL P1b (max-tracks='muchos') REPRODUCIDA TEXTUAL.
  · CORRUPT_FILE multi-pista (merge.ts:180-185, details {ids, nombres, causas}):
    ««{nombre}» está dañado…» (plantilla singular vs nombres plural).
  · PROBE_FAILED general (ffmpeg.ts:148-152, details {n}) e invariante (merge.ts:165-169,
    details {esperados, recibidos}): «No se pudo analizar {nombres}.»
  · UNSUPPORTED_FORMAT de sonda (ffmpeg.ts:162-166, details {nombre}): «{formato}».
  La afirmación «parametrosDeError ÚNICO y completo» queda refutada (no mapea
  atributo/recibido, ni fallback n→nombres / nombres→nombre); el test nuevo usa
  «details representativos» que NO son los de esos constructores (CORRUPT_FILE con nombre
  singular, PROBE_FAILED con nombres, CONFIG_INVALID con problemas).
- B4 (doble merge con aviso): RESUELTO — unionEnCurso true desde antes del diálogo hasta el
  finally (element:352-365). EJECUTADO: 2ª llamada → JOB_IN_PROGRESS inmediato; la 1ª
  promesa RECHAZA USER_CANCELLED (antes: colgada para siempre).
- B5 (homónimos): RESUELTO — parejas posicionales {archivo, pista} (element:203-239).
  EJECUTADO: archivos.get(idA)===f1 y archivos.get(idB)===f2 con dos File homónimos
  homotamaño y contenido distinto (antes: el MISMO File para ambas).
- B6 (clear/reset a mitad): RESUELTO — clear()/reset() cancelan si unionEnCurso
  (element:300-323); merge() con unión en curso → JOB_IN_PROGRESS; URL anterior revocada al
  JOB_INICIADO (element:413); red de seguridad tras JOB_COMPLETADO si el reducer descartó
  (element:454). EJECUTADO: signal.aborted=true tras clear() y tras reset() con job en
  vuelo; merge() durante job → JOB_IN_PROGRESS (sin 2º mergeTracks concurrente).
- B7 (estados inalcanzables): RESUELTO — JOB_CANCELADO fija error USER_CANCELLED
  (reducer.ts:165-174) → state 'cancelled' + «Unión cancelado» visibles y sin panel de
  error (renderizarError omite USER_CANCELLED, element:1060) — EJECUTADO en el reducer y
  por lectura del render; marcarPistasInvalidas (element:486-497) con renderizarLista en el
  catch (element:475) — EJECUTADO: status 'invalid' + errorCode CORRUPT_FILE + chip «No se
  puede unir» + data-tipo=invalid + title=CORRUPT_FILE + fila data-estado=invalid (borde
  rojo por CSS) + exclusión de la siguiente unión (1 unible de 2).

DEFECTO BLOQUEANTE NUEVO (introducido por el fix de B2, demostrado en jsdom y Chromium real):
- N1: clear() con lista virtualizada NO resetea el espaciador (la rama empty de
  renderizarLista, element:729-744, limpia maxHeight/overflowY/position/onscroll pero NO
  espaciador.style.height; la rama no-virtual, 783-788, sí). EJECUTADO en Chromium: tras
  clear() con 55 pistas, espaciador renderiza 3960px SIN max-height → lista.clientHeight
  4024px: un HUECO VACÍO de ~4000px bajo «Aún no hay pistas» (botón «Vaciar lista» =
  flujo primario). Vaciado por removeTrack() masivo SÍ transiciona bien (55→50 resetea a
  0px; →0 deja 0px). Fix: resetear espaciador.style.height='0px' en la rama empty.

DEFECTOS NO BLOQUEANTES (residuales):
1. Aviso-backout (Cancelar en el diálogo ANTES de JOB_INICIADO): merge() rechaza
   USER_CANCELLED y emite cancelled, pero no toca estado.error → state 'idle' y barra vacía.
   rendering.md:35-37 («cancelled persiste tras la cancelación») es cierto para la
   cancelación mid-job, no para el backout del aviso. Matiz de doc/UX.
2. clear()/reset() mid-job: el JOB_CANCELADO tardío (catch de la promesa aún en vuelo) fija
   error USER_CANCELLED DESPUÉS del clear/reset → state final 'cancelled' con lista vacía
   (no idle). Feedback razonable pero no documentado.
3. parseAtributo importado sin uso (element:16) — import muerto (typecheck sin
   noUnusedLocals no lo caza).
4. ICONOS.subirDeshabilitado sigue DECLARADO y sin uso (element:36): el claim «icono
   duplicado eliminado» solo eliminó el USO (bajar usa ICONOS.subir rotado), no la constante.
5. avisoPendiente sigue siendo un campo de estado sin consumidor en la UI (AVISO_PENDIENTE
   / LIMPIAR_AVISO se computan y nadie los pinta).
6. marcarPistasInvalidas solo marca cuando details.ids existe (camino CORRUPT_FILE mixto de
   merge.ts): UNSUPPORTED_FORMAT de sonda (details {nombre}) y PROBE_FAILED general
   (details {n}) NO marcan pistas (sin ids). Cobertura parcial, coherente con el claim
   («con details.ids») pero conviene documentarla en rendering.md:30.
7. Gap de 8px del flex entre el espaciador (0px) y la primera fila en modo no-virtual:
   ~8px extra arriba (cosmético, introducido por el espaciador permanente).
8. En modo virtual las filas tienen height fijo 72px: contenido que desborde (meta con wrap)
   se solapa con la fila siguiente (cosmético; no verificado a fondo).
9. Claves i18n sin uso: app.cargando, toolbar.calidad, estado.avisos, misc.cerrar,
   misc.entendido (opcion.fade la consume el descriptor de fundido).
10. Scroll físico con rueda/arrastrón del scrollbar y DnD con ratón: NO VERIFICADO
   físicamente (wheel sintetizado sí: avanza por ratchet). Repro F6 con agent-browser
   (drag del mango a otra fila, arrastre del scrollbar real).

NO VERIFICADO (con repro): DnD físico con ratón (la lógica y anuncios probados en jsdom);
motor WASM real dentro del componente y preescucha/descarga (demo/ vacía, dist/ inexistente
— deuda F6); el scroll físico continuo con rueda real (el wheel sintetizado ratchea, lo que
de hecho EVIDENCIA el bloqueante B2-parcial).

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test > /tmp/t.txt 2>&1; echo "exit=$?"; tail -5 /tmp/t.txt
exit=0
 ✓ tests/ui-elemento.test.ts (17 tests) 866ms
   ✓ <audio-merger>: virtualización real y regresiones del árbitro > 55 pistas: contenedor con scroll interno y SOLO la ventana montada  527ms

 Test Files  14 passed (14)
      Tests  188 passed (188)
   Start at  05:55:04
   Duration  5.85s (transform 462ms, setup 0ms, collect 861ms, tests 1.76s, environment 276ms, prepare 715ms)
(grep "Errors" /tmp/t.txt → 0 coincidencias)

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
exit=0

Sonda Chromium real (componente real, 55 pistas) — extracto:
estado inicial: {"pistas":55,"filasEnDom":11,"maxHeight":"480px","overflowY":"auto","overflowComputado":"auto","clientHeightReal":480,"scrollHeight":792,"espaciador":"3960px","scrollTop":0,"notaVirtual":"Lista larga: reordena con los botones ↑ "}
espaciador: {"espaciadorStyleHeight":"3960px","espaciadorAlturaREAL":480,"display":"list-item","flexShrink":"1","flexBasis":"auto","listaDisplay":"flex","listaClientHeight":480,"listaScrollHeight":792}
ratchet (scrollTop=999999 × 14): 312→600→888→1176→1464→1752→2040→2328→2616→2904→3192→3480 (fila 55 alcanzada a la 11ª iteración; filas 15→11)
tras clear() con lista virtualizada: {"espaciadorRender":3960,"espaciadorStyle":"3960px","listaClient":4024,"listaScrollH":4024,"vacia":"Aún no hay pistas. Añade "}

Sonda jsdom (vitest, src real) — extracto de las repros originales:
INFO | status='ready' durationMs=null state='idle' meta="duración desconocida · 1000 B · MP3"     → B1 RESUELTO
INFO | anuncio = "Pista rechazada: raro.xyz — Formato no admitido: xyz"                            → B3 (parcial) ok aquí
INFO | panel = "Configuración inválida: {detalle}…"                                                 → B3: repro original P1b INTACTA
FUGA | CORRUPT_FILE multi-pista → "«{nombre}» está dañado o no es un audio válido."
FUGA | PROBE_FAILED sonda general / invariante → "No se pudo analizar {nombres}."
FUGA | UNSUPPORTED_FORMAT de sonda → "Formato no admitido: {formato}"
INFO | cruce = false; f1→A=true, f2→B=true                                                          → B5 RESUELTO
INFO | merge()#2 → rechazada:JOB_IN_PROGRESS | merge()#1 → rechazada:USER_CANCELLED                 → B4 RESUELTO
INFO | eliminada pos 2 → foco en la que ocupa su posición; última → nueva última                    → foco RESUELTO
INFO | 55 pistas: filas=11 maxHeight=480px overflowY=auto espaciador=3960px                        → B2 (jsdom ok)
INFO | tras clear() con job en vuelo: signal.aborted=true job=null pistas=0                         → B6 RESUELTO
INFO | tras JOB_CANCELADO: job=null error=USER_CANCELLED; estado derivado='cancelled'              → B7 RESUELTO
INFO | status='invalid' errorCode='CORRUPT_FILE' | chip="No se puede unir" data-tipo=invalid title=CORRUPT_FILE fila data-estado=invalid → B7 RESUELTO
INFO | foco: Continuar→Tab→Cancelar→Tab→(cicla)→Shift+Tab→Continuar                                → trampa de foco ok

Stage Summary:
- VEREDICTO: FASE 5: RECHAZADA (2 bloqueantes originales PARTIALMENTE corregidos + 1
  bloqueante NUEVO introducido por el fix; los tres demostrados por ejecución propia del
  árbitro, dos de ellos en Chromium real; los tres son arreglos de pocas líneas).
- RESUELTOS y verificados por ejecución: B1 (suite verde exit 0 sin unhandled errors,
  pistas jamás atascadas), B4 (JOB_IN_PROGRESS + 1ª promesa siempre settle), B5 (parejas
  posicionales), B6 (abort + guardas + revocaciones), B7 (cancelled visible + fila
  invalid con chip/exclusión). No bloqueantes corregidos y verificados: foco posicional,
  trampa de foco, motor preservado durante unión, disconnectedCallback diferido,
  trasAviso fuera, ||420→maxHeightPx, indiceDesdeY/alturaTotal fuera, docs actualizadas.
- Bloqueantes residuales: (B2-parcial) espaciador anulado por flex-shrink:1 → scroll
  interno acotado a la ventana montada (ratchet de 11 pasos para llegar a la fila 55,
  scrollbar engañoso, D-06/rendering.md refutados en layout real; el test jsdom pasa por
  no hacer layout). Fix: flex-shrink:0. (B3-parcial) 7 variantes reales de 3 códigos
  siguen filtrando tokens crudos, incluida la repro original P1b (CONFIG_INVALID de
  atributo ilegible) textual y CORRUPT_FILE multi-pista; «parametrosDeError completo»
  refutado. Fix: mapear atributo/recibido→detalle y fallbacks n→nombres / nombres→nombre.
  (N1-nuevo) clear() con lista virtualizada deja el espaciador a 3960px sin max-height →
  hueco vacío de ~4024px bajo «Aún no hay pistas» (Chromium real). Fix: resetear el
  espaciador en la rama empty de renderizarLista.
- Condición de reapertura: los 3 fixes + tests discriminantes (jsdom: espaciador 0px tras
  clear virtual; navegador real: espaciador renderizado ≈ total y scrollTop=3480 alcanzable
  en UN salto; interpolación sin tokens para las 7 variantes citadas con los details de
  los constructores reales). El árbitro re-ejecutará `bun run test` (exit 0), typecheck y
  las sondas jsdom + Chromium.
---
Task ID: 11
Agent: árbitro adversarial (Fase 5, tercera pasada)
Task: Verificación independiente de las correcciones de los 3 bloqueantes residuales + no bloqueantes

Work Log:
- Releídos los archivos corregidos: src/ui/audio-merger-element.ts (espaciador flex/display,
  rama empty con reset, aviso-cancelado con ERROR USER_CANCELLED, parametrosDeError ampliado),
  src/i18n/es.ts (5 claves muertas fuera), tests/ui-elemento.test.ts (variantes SONDA/MULTI/
  ATRIBUTO/INVARIANTE + aserciones de espaciador), docs/rendering.md.
- EJECUTADO (salidas reales abajo): `bun run test` → 186/188 pasan PERO exit=1 con
  «Test Files 1 failed | 13 passed (14)» y 2 tests fallando (0 «Errors»: sin unhandled
  rejections — B1 sigue verde); `bun run typecheck` → exit 0.
- Re-lanzada la sonda en NAVEGADOR REAL (Chromium vía agent-browser + vite dev del propio
  repo con cacheDir/port fuera del repo): 55 pistas → altura REAL del espaciador
  (getBoundingClientRect), flexShrink computado, scrollHeight, UN salto a scrollTop=3480,
  UN salto a 0, rueda sintética ×3, y clear() tras virtualizar.
- Sondas jsdom propias (vitest, src real): T1 las 7 variantes de la 2ª pasada; T2 repro P1b
  real (panel max-tracks=muchos); T3 N1 (clear tras 55); T4 aviso-cancelado; T5 espaciador
  display:none en modo normal; T6 regresión B4/B6; T3bis fuga UNSUPPORTED_FORMAT por el
  camino AGREGADO REAL (mergeTracks + motor simulado que reporta «abre pero sin audio»);
  T3tris fuga en los AVISOS del panel de resultado (mergeTracks → JOB_COMPLETADO → render,
  con motor simulado que produce DURATION_MISMATCH); T3quad edge clear()-durante-diálogo.
- Diagnóstico del fallo flex: el código asigna `style.flex='none'` (element:789) y jsdom lo
  serializa como '0 0 auto' (normalización CSSOM: flex:none ≡ 0 0 auto) — verificado con un
  li de control en la sonda T3. El CÓDIGO es correcto; la ASERCIÓN `toBe('none')` del test
  nuevo es la que falla.

Verificación de las correcciones declaradas (una a una):
1. (B2-parcial espaciador/flex) RESUELTO y VERIFICADO en Chromium real: espaciador
   style.height=3960px con altura RENDERIZADA 3960px (antes 480 — flex-shrink:1),
   flexShrink computado '0', lista.scrollHeight=3960 (antes 792), 11 filas montadas de 55.
   UN salto a scrollTop=3480 → filas 45..55 (antes: clamp en 312px + ratchet de 11 gestos);
   UN salto a 0 → fila 1. D-06/rendering.md («altura total sintética», «solo filas de la
   ventana») ahora COINCIDEN con el layout real. Rueda sintética: no produce scroll nativo
   (limitación del evento no confiable — ver no verificados).
2. (B3-parcial i18n) 6 de 7 variantes RESUELTAS y verificadas: CONFIG_INVALID de atributo
   («Configuración inválida: atributo «max-tracks» con valor «muchos»» — mi repro P1b,
   accionable y con el atributo citado), atributo vacío, enum, CORRUPT_FILE multi-pista
   (««a.mp3» está dañado…»), PROBE_FAILED general e invariante («No se pudo analizar las 2
   pistas.»). PERO queda 1 fuga REAL (ver bloqueante 1) + 1 fuga NUEVA detectada (bloqueante 2).
3. (N1 clear tras virtualizar) RESUELTO y VERIFICADO (jsdom + Chromium): espaciador → 0px +
   display:none + maxHeight=''; en Chromium la lista vuelve a client 56px (antes: hueco de
   4024px bajo «Aún no hay pistas»). El propio test del proyecto lo cubre.
4. No bloqueantes corregidos y verificados: aviso-cancelado fija ERROR USER_CANCELLED antes
   del JOB_INICIADO (element:391-394) → state 'cancelled' + «Unión cancelada» visibles y SIN
   panel de error (ejecutado T4); parseAtributo import eliminado (grep: solo parseAtributos,
   element:16); ICONOS.subirDeshabilitado eliminado (grep: 0); las 5 claves i18n muertas
   eliminadas (grep una a una: app.cargando/toolbar.calidad/estado.avisos/misc.cerrar/
   misc.entendido ausentes de es.ts); espaciador display:none en modo no-virtual → residual 7
   (gap de 8px) corregido (ejecutado T5: height=0px display='none' con 3 pistas).

DEFECTOS BLOQUEANTES (3, todos de pocas líneas):
1. UNSUPPORTED_FORMAT sigue filtrando {formato} — y es el camino REAL: demostrado
   END-TO-END con mergeTracks + motor simulado (1 entrada que el probe ABRE pero sin audio
   decodificable — el caso ffmpeg.ts:160-167): mergeTracks lanza el AGREGADO con code
   UNSUPPORTED_FORMAT y details {ids:["b"], nombres:["video.m4a"], causas:[…]}
   (merge.ts:172-185) → mensajeDeError → «Formato no admitido: {formato}». También la forma
   per-pista {nombre} (ffmpeg.ts:162-166). El test NUEVO del proyecto
   (UNSUPPORTED_FORMAT_SONDA) lo DETECTA — de ahí la suite roja: el test tiene razón, el
   código no. parametrosDeError mapea nombres→nombre pero nada mapea formato cuando
   falta extension/mimeType (nombres[0] no se usa como fallback de formato). Fix:
   `if (params.formato === undefined && params.nombre !== undefined) params.formato = extensionDe(String(params.nombre)) || String(params.nombre)` — o plantilla con {nombre}.
2. NUEVO (clase B3, presente desde la F5 original; omitido por el árbitro en las pasadas 1-2
   — se declara la omisión): los AVISOS del panel de resultado se interpolan SIN params:
   renderizarResultado llama `t('avisoCodigo.DURATION_MISMATCH')` sin segundo argumento
   (element:1057) → el usuario ve «⚠ La duración del resultado ({obtenida}) no coincide con
   la esperada ({esperada}). Revisa el audio antes de usarlo.» — demostrado END-TO-END
   (mergeTracks con duración discordante → warning DURATION_MISMATCH → JOB_COMPLETADO →
   render). Es un camino plausible REAL: D-04/plan declaran que MP3 VBR/Xing dispara
   DURATION_MISMATCH como advertencia informativa. Fix: interpolar con params (obtenida/
   esperada, p. ej. parseando w.message o ampliando el payload) o caer a w.message cuando no
   hay params — y añadir la variante al test de interpolación.
3. Suite ROJA: `bun run test` → exit=1 con 2 tests fallando. Causa (a): el bloqueante 1 (el
   test de interpolación del propio proyecto falla en UNSUPPORTED_FORMAT_SONDA — el test es
   correcto). Causa (b): `expect(espaciador.style.flex).toBe('none')` recibe '0 0 auto'
   (normalización CSSOM de jsdom — flex:none ≡ 0 0 auto; verificado con li de control y con
   Chromium: flexShrink computado '0', altura real 3960). El código ES correcto; el TEST
   está mal escrito (debe asertar '0 0 auto', o `style.flexShrink === '0'`, o
   getComputedStyle en navegador). La condición de aprobación (exit 0) no se cumple mientras
   cualquiera de las dos causas siga en pie.

DEFECTOS NO BLOQUEANTES (residuales):
1. Edge API (el overlay bloquea la vía UI): clear()/reset() DURANTE el diálogo de aviso no
   aborta (controlador aún null) ni cierra el diálogo; la promesa de merge() queda pendiente
   y Continuar tras el clear inicia una unión con pistas ya inexistentes y Blobs vacíos
   (`archivos.get(p.id) ?? new Blob()`, element:419) — ejecutado T3quad (diálogo abierto con
   0 pistas; merge → rechazo; en navegador real iría al motor con entradas vacías). Fix
   barato: `this.avisoResolver?.(false)` en clear/reset.
2. clear/reset mid-job: el JOB_CANCELADO del catch (aún en vuelo) fija error
   USER_CANCELLED DESPUÉS del clear/reset → estado final 'cancelled' con lista ya vacía
   (matiz de UX no documentado en rendering.md).
3. avisoPendiente sigue sin consumidor en la UI (AVISO_PENDIENTE/LIMPIAR_AVISO computan un
   campo que nadie pinta).
4. marcarPistasInvalidas cubre solo details.ids (agregados CORRUPT/UNSUPPORTED/PROBE):
   PROBE_FAILED general {n} no marca pistas — cobertura parcial no declarada en
   rendering.md:30.
5. Filas a 72px fijas en modo virtual: contenido que desborde (meta con wrap) puede
   solaparse con la fila siguiente (cosmético; no verificado a fondo).
6. Doble llamada a t() con template anidado en el sentinel de avisos (element:1057) —
   legibilidad/coste trivial (nit).

NO VERIFICADO (con repro): rueda física real del ratón sobre la lista y DnD físico
(arrastre del mango a otra fila) — el WheelEvent sintético NO produce scroll nativo en
Chromium (limitación del evento no confiable, no defecto del código); el scrollbar/End
sí funcionan porque scrollHeight=3960 verificado. Repro F6 con input real de ratón vía
CDP (Input.dispatchMouseEvent) o interactivo. Motor WASM real dentro del componente y
preescucha/descarga: demo/ vacía y dist/ inexistente (deuda F6 declarada).

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test > /tmp/t.txt 2>&1; echo "exit=$?"; tail -4 /tmp/t.txt
exit=1
 Test Files  1 failed | 13 passed (14)
      Tests  2 failed | 186 passed (188)
   Start at  06:13:24
   Duration  5.91s (transform 426ms, setup 0ms, collect 849ms, tests 2.52s, environment 275ms, prepare 735ms)

(grep "Errors" /tmp/t.txt → 0 coincidencias; los 2 fallos:
 · ui-elemento.test.ts > «55 pistas: contenedor con scroll interno…»: AssertionError:
   expected '0 0 auto' to be 'none' — aserción de flex vs normalización CSSOM de jsdom.
 · ui-elemento.test.ts > «mensajes de error SIN tokens…»: AssertionError:
   UNSUPPORTED_FORMAT_SONDA con token sin interpolar: «Formato no admitido: {formato}».)

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
exit=0

Sonda Chromium real (componente real, 55 pistas) — extracto:
55 pistas: {"espaciadorStyleHeight":"3960px","espaciadorAlturaREAL":3960,"flexComputado":"0","filasEnDom":11,"listaClientHeight":480,"listaScrollHeight":3960,"scrollTop":0}
UN salto al final (scrollTop=3480): {"scrollTop":3480,"scrollHeight":3960,"filas":11,"nums":"45,46,47,48,49,50,51,52,53,54,55","ultima":55}
UN salto al principio: {"scrollTop":0,"filas":11,"primera":1}
rueda sintética ×3 (deltaY 360): scrollTop permanece 0 (evento sintético sin scroll nativo — no verificado físicamente)
clear() tras virtualizar: {"espaciadorRender":0,"espaciadorStyle":"0px","display":"none","listaClient":56,"scrollH":792,"vacia":"Aún no hay pistas. A"}

Sonda jsdom (vitest, src real) — extracto:
ok   | CONFIG_INVALID atributo ilegible (P1b) → "Configuración inválida: atributo «max-tracks» con valor «muchos»"
ok   | CORRUPT_FILE multi-pista → "«a.mp3» está dañado o no es un audio válido."
ok   | PROBE_FAILED sonda general / invariante → "No se pudo analizar las 2 pistas."
FUGA | UNSUPPORTED_FORMAT de sonda → "Formato no admitido: {formato}"
INFO | tras clear(): height=0px display='none' maxHeight='' → N1 RESUELTO
INFO | tras cancelar aviso: merge()→USER_CANCELLED state='cancelled' texto='Unión cancelada' panelError='' → aviso-cancelado RESUELTO
INFO | 3 pistas: espaciador height=0px display='none' → residual 7 RESUELTO
INFO | merge#2→JOB_IN_PROGRESS (B4 intacto)

Sonda camino REAL end-to-end (mergeTracks + motor simulado):
agregado UNSUPPORTED_FORMAT: code=UNSUPPORTED_FORMAT details={"ids":["b"],"nombres":["video.m4a"],"causas":["UNSUPPORTED_FORMAT"]}
→ mensajeDeError = "Formato no admitido: {formato}"                                    → FUGA (bloqueante 1)
warnings DURATION_MISMATCH: [{"code":"DURATION_MISMATCH","message":"duración obtenida 5000 ms ≠ esperada 2000 ms…"}]
→ panel de avisos = "⚠ La duración del resultado ({obtenida}) no coincide con la esperada ({esperada})." → FUGA (bloqueante 2)

Stage Summary:
- VEREDICTO: FASE 5: RECHAZADA (tercera pasada; 3 bloqueantes, todos de pocas líneas y
  demostrados por ejecución propia del árbitro — dos de ellos end-to-end contra mergeTracks
  real—; el proyecto está a un paso del cierre).
- RESUELTOS y verificados en esta pasada: B2-parcial (espaciador flex:none: altura real
  3960, scrollHeight 3960, UN salto al final/ principio — en Chromium real), N1 (clear tras
  virtualizar: 0px + display:none, sin hueco — jsdom y Chromium), aviso-cancelado ('cancelled'
  + «Unión cancelada» sin panel), residual 7 (espaciador oculto en modo normal) y la limpieza
  declarada (parseAtributo, subirDeshabilitado, 5 claves i18n).
- Bloqueantes: (1) UNSUPPORTED_FORMAT filtra {formato} en el camino REAL agregado
  (merge.ts:172-185) y en la forma per-pista — el propio test nuevo del proyecto lo detecta
  (suite roja por esa causa); (2) NUEVO y de la misma clase: los avisos DURATION_MISMATCH del
  panel de resultado se interpolan sin params → {obtenida}/{esperada} crudos (presente desde
  la F5 original; omisión propia del árbitro en pasadas 1-2, declarada); (3) suite roja
  exit=1: la causa (1) más la aserción flex toBe('none') que choca con la normalización
  CSSOM de jsdom ('0 0 auto') — código correcto (Chromium: flexShrink 0, altura 3960), test
  mal escrito.
- Condición de reapertura: fix del fallback formato (extensionDe(nombre)/nombres[0] →
  params.formato), interpolación con params (o caída a w.message) de los avisos del panel de
  resultado + variante en el test, y corrección de la aserción flex ('0 0 auto' o
  style.flexShrink '0'). El árbitro re-ejecutará `bun run test` (exigiendo exit 0),
  typecheck, la sonda Chromium del espaciador y las dos sondas end-to-end de interpolación.
---
Task ID: 11
Agent: árbitro adversarial (Fase 5, cuarta pasada)
Task: Verificación independiente de las correcciones de los 3 bloqueantes de la tercera pasada

Work Log:
- Releídos los archivos corregidos: src/ui/audio-merger-element.ts (parametrosDeError con
  fallback de formato por extensión del nombre; renderizarResultado interpola w.params con
  caída a w.message; clear/reset cierran el aviso), src/core/types.ts (MergeWarning.params?),
  src/core/merge.ts (DURATION_MISMATCH con params formateados), src/core/reducer.ts
  (ResultadoUI — SIN cambios), tests/ui-elemento.test.ts (aserción flex '0 0 auto' +
  flexShrink '0'), tests/unit/i18n.test.ts (plantillas de aviso con params).
- EJECUTADO (salidas reales abajo): `bun run test` → 189/189 en 14 ficheros, EXIT 0, sin
  línea «Errors»; `bun run typecheck` → exit 0.
- Re-lanzadas TODAS las sondas: T1–T6 (jsdom: 7 variantes i18n, N1, aviso-cancelado,
  espaciador normal, regresiones B4/B6), t3bis (agregado UNSUPPORTED_FORMAT end-to-end),
  t3tris (avisos del resultado end-to-end), t3quad (clear durante aviso) y una sonda NUEVA
  t4 que recorre el camino COMPLETO del elemento REAL: merge() público con motor simulado
  inyectado → JOB_COMPLETADO → renderizarResultado → panel .am-avisos (con stub de
  URL.createObjectURL aplicado tras addFiles para salvar la limitación de jsdom — la lectura
  de duración ya había degradado a null con la guarda B1).
- Re-lanzada la sonda Chromium real (componente real, 55 pistas) para confirmar que el
  espaciador no regresó.

Verificación de las correcciones declaradas (una a una):
1. (B1 formato sin interpolar) RESUELTO — fallback `formato ← extensión del nombre real`
   (element:1207-1214: d.nombre o primer d.nombres → extensión tras el último punto).
   EJECUTADO end-to-end: mergeTracks + motor simulado (entrada que abre sin audio
   decodificable) → agregado UNSUPPORTED_FORMAT {ids, nombres, causas} → «Formato no
   admitido: m4a» (antes «{formato}»). Las 7 variantes de la 2ª/3ª pasada ahora limpias
   (T1: fugas 0). El test del proyecto UNSUPPORTED_FORMAT_SONDA pasa.
2. (B2 avisos del resultado) PARCIAL → MANTIENE carácter bloqueante: merge.ts construye
   DURATION_MISMATCH con params {obtenida:'0:05', esperada:'0:02'} (verificado en la salida
   de mergeTracks) y renderizarResultado interpola t('avisoCodigo.X', w.params) con caída a
   w.message (element:1060-1064) — PERO la tubería intermedia ROMPE el dato:
   unionInterna construye ResultadoUI con `warnings.map((w) => ({ code, message }))`
   (element:456) — DESCARTA params — y ResultadoUI.warnings está tipado
   `{ code: string; message: string }[]` (reducer.ts:29, sin params). Demostrado por
   ejecución en el camino COMPLETO del elemento REAL (merge() público + motor simulado):
   warnings EN ESTADO = [{code, message}] (params perdidos) y PANEL renderizado =
   «⚠ La duración del resultado ({obtenida}) no coincide con la esperada ({esperada}).
   Revisa el audio antes de usarlo.» — tokens crudos visibles al usuario. El test nuevo de
   i18n interpola las plantillas directamente (no por el elemento) y por eso pasa en verde.
   Fix de una línea: conservar params en element:456 (`warnings: salida.warnings.map((w) =>
   ({ ...w }))` o mapear code/message/params) + añadir params al tipo de
   ResultadoUI.warnings (+ test de UI por el camino del elemento).
3. (B3 suite roja) RESUELTO — aserción corregida a la forma normalizada por CSSOM de jsdom
   (`flex === '0 0 auto'` Y `flexShrink === '0'`, con comentario que lo explica,
   tests:160-162). Suite 189/189 exit 0. Confirmado en Chromium (3ª pasada, sin cambios en
   el código del espaciador): altura real 3960, flexShrink '0', UN salto al final → fila 55.
Extra (residual 1 de la 3ª pasada) RESUELTO — clear()/reset() con aviso abierto:
   `this.avisoResolver?.(false)` (element:301, 314). EJECUTADO (t3quad): diálogo cerrado,
   merge() → USER_CANCELLED, sin promesa colgada y sin unión fantasma con pistas vacías.

Re-verificaciones de todo lo anterior (nada regresó):
- B1 (F5): pistas 'ready' con duración null en jsdom; 0 unhandled rejections (sin «Errors»).
- B4: merge() simultáneo → JOB_IN_PROGRESS; la 1ª promesa settle (USER_CANCELLED).
- B5: homónimos — f1→A y f2→B (test del proyecto + sonda).
- B6: clear/reset mid-job abortan (verificado en 2ª pasada; t3quad confirma el cierre del
  aviso). Nota de sonda: en T6 «aborted=undefined» es el caso aviso-cancelado (controlador
  aún null ANTES de JOB_INICIADO — correcto, no hay job que abortar).
- B7: 'cancelled' visible («Unión cancelada», sin panel); fila invalid con chip/title/
  data-estado (2ª pasada; sin cambios).
- N1: clear tras virtualizar → espaciador 0px + display:none (jsdom y Chromium).
- Chromium real (55 pistas): espaciador 3960px renderizados, scrollHeight 3960, 11 filas,
  UN salto a 3480 → filas 45-55, UN salto a 0 → fila 1, clear → lista 56px sin hueco.

DEFECTOS BLOQUEANTES (1):
1. Los params de los avisos se descartan a mitad de camino (element:456 + reducer.ts:29):
   merge.ts los produce, renderizarResultado los consume, pero ResultadoUI los pierde →
   DURATION_MISMATCH (y cualquier aviso futuro con params) se muestra con tokens crudos
   {obtenida}/{esperada} al usuario. Demostrado por ejecución en el camino REAL del
   elemento (merge() público). Fix: preservar params en el map de element:456 + campo en el
   tipo + test de UI por el camino del elemento (los tests directos de i18n no cubren la
   tubería). Vecino del mismo defecto (mismo map): el payload del evento unionCompletada
   (element:465) y `get result()` (element:192) también descartan params — el tipo público
   MergeOutput los declara opcionales (types.ts:108), así que typechequea en silencio; ver
   residuales 1-2.

DEFECTOS NO BLOQUEANTES (residuales):
1. `get result()` (element:192) descarta w.params del MergeOutput público: el host que
   gestione sus propios avisos pierde {obtenida}/{esperada} (el campo es opcional en el
   tipo, luego typechequea). Mismo map que el bloqueante — corregir juntos.
2. El payload audiomerger:merge-completed (element:465 + DetalleAdvertencia en
   eventos.ts:48-51) tampoco transporta params — decisión de contrato a documentar si no se
   añade.
3. Heredados ya declarados (sin cambios): clear/reset mid-job dejan estado final
   'cancelled' con lista vacía (matiz no documentado); avisoPendiente sin consumidor en la
   UI; marcarPistasInvalidas cubre solo details.ids; filas 72px fijas en virtual (posible
   solape); doble t() en el sentinel de avisos (nit).
4. WheelEvent sintético no produce scroll nativo en Chromium (limitación del evento, no del
   código; scrollbar/End verificados) — scroll físico con rueda real y DnD con ratón siguen
   NO VERIFICADOS (repro F6 vía CDP Input.dispatchMouseEvent). Motor WASM real dentro del
   componente y preescucha: demo/ vacía y dist/ inexistente (deuda F6).

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test > /tmp/t.txt 2>&1; echo "exit=$?"; tail -4 /tmp/t.txt
exit=0

 Test Files  14 passed (14)
      Tests  189 passed (189)
   Start at  06:29:00
   Duration  5.76s (transform 437ms, setup 0ms, collect 827ms, tests 2.43s, environment 274ms, prepare 715ms)
(grep "Errors" /tmp/t.txt → 0 coincidencias)

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
exit=0

Sonda camino REAL del elemento (merge() público + motor simulado) — el bloqueante:
INFO | merge() → resuelta
INFO | warnings EN ESTADO (tras unionInterna): [{"code":"DURATION_MISMATCH","message":"duración obtenida 5000 ms ≠ esperada 2000 ms…"}]   ← params DESCARTADOS
INFO | PANEL de avisos = "⚠ La duración del resultado ({obtenida}) no coincide con la esperada ({esperada}). Revisa el audio antes de usarlo."
FUGA | panel renderizado con tokens crudos = true

Sonda agregado UNSUPPORTED_FORMAT (t3bis, end-to-end) — RESUELTO:
INFO | mergeTracks rechaza con code=UNSUPPORTED_FORMAT details={"ids":["b"],"nombres":["video.m4a"],"causas":["UNSUPPORTED_FORMAT"]}
INFO | mensajeDeError = "Formato no admitido: m4a"  → ok

Sonda jsdom T1 (7 variantes): fugas 0 («atributo «max-tracks» con valor «muchos»», ««a.mp3» está dañado…», «las 2 pistas», «m4a»…)
Sonda t3quad (clear durante aviso): dialogoAbierto=false, merge→USER_CANCELLED → RESUELTO
Sonda Chromium (55 pistas): {"espaciadorAlturaREAL":3960,"flexComputado":"0","listaScrollHeight":3960,"filasEnDom":11} | UN salto {"scrollTop":3480,"nums":"45,…,55"} | clear {"espaciadorRender":0,"display":"none","listaClient":56}

Stage Summary:
- VEREDICTO: FASE 5: RECHAZADA (cuarta pasada; 1 solo defecto bloqueante, de UNA línea, y
  demostrado por ejecución en el camino completo del elemento real; todo lo demás de las
  pasadas 1-3 está resuelto, verificado y sin regresiones — suite 189/189 exit 0, typecheck
  limpio, virtualización confirmada en Chromium, 7 variantes i18n limpias, clear-durante-
  aviso cerrado).
- Bloqueante único: los params de los avisos se descartan en element:456 al construir
  ResultadoUI (y el tipo reducer.ts:29 no los declara) → el panel de resultado muestra
  «({obtenida})…({esperada})» crudos en DURATION_MISMATCH. El fix de merge.ts y el consumo
  en renderizarResultado son correctos; falta preservar el dato en el punto intermedio.
- Condición de reapertura: preservar params en element:456 (+ tipo ResultadoUI + ideally
  get result/evento) y un test de UI que recorra el camino del elemento (no solo plantillas
  directas). El árbitro re-ejecutará `bun run test` (exit 0), typecheck y la sonda t4
  (camino REAL del elemento), que hoy falla con «panel renderizado con tokens crudos = true».
---
Task ID: 11
Agent: árbitro adversarial (Fase 5, quinta pasada)
Task: Verificación independiente del cierre del último bloqueante (params de avisos) + revocarURL

Work Log:
- Releídos los archivos corregidos: src/core/reducer.ts (ResultadoUI.warnings con
  params?: Readonly<Record<string, string|number>>), src/ui/audio-merger-element.ts
  (unionInterna preserva params en ResultadoUI element:456, en el payload del evento
  element:465 y en get result() element:192; revocarURL() con guarda de entorno
  element:1250-1252 aplicada a TODAS las revocaciones: disconnect diferido, reset, clear,
  pre-JOB_INICIADO y red de seguridad), src/core/eventos.ts (DetalleAdvertencia.params),
  tests/ui-elemento.test.ts (test NUEVO del camino del elemento: ResultadoUI con params →
  renderizarResultado → panel con «0:05»/«0:02» y cero tokens).
- EJECUTADO (salidas reales abajo): `bun run test` → 190/190 en 14 ficheros, EXIT 0, sin
  «Errors» ni unhandled rejections ni TypeErrors; `bun run typecheck` → exit 0.
- Re-lanzada la sonda t4 (camino COMPLETO del elemento real: merge() público con motor
  simulado inyectado → JOB_COMPLETADO → render): warnings EN ESTADO conservan params
  ({obtenida:'0:05', esperada:'0:02'}) y el PANEL renderizado interpola — «⚠ La duración
  del resultado (0:05) no coincide con la esperada (0:02).» — CERO tokens. Esta era MI
  condición de reapertura exacta y pasa.
- Re-lanzadas todas las sondas de regresión: t3bis (agregado UNSUPPORTED_FORMAT → «Formato
  no admitido: m4a») ✓; t3 T1-T6 (7 variantes i18n fugas 0; N1 espaciador 0px+none;
  aviso-cancelado 'cancelled' + «Unión cancelada»; espaciador none en modo normal; B4
  doble-merge JOB_IN_PROGRESS) ✓; t3quad (clear durante aviso → diálogo cerrado,
  USER_CANCELLED) ✓; t3tris (nota: fallaba SOLO porque mi propia sonda mapeaba warnings
  descartando params — la alineé con el mapeo real del elemento y el panel interpola
  limpio; el camino del elemento estaba ya cubierto por t4) ✓; Chromium real (55 pistas:
  espaciador 3960px renderizados, flexShrink '0', scrollHeight 3960, 11 filas montadas,
  UN salto a 3480 → filas 45-55, UN salto a 0 → fila 1; clear → lista 56px sin hueco) ✓.
- Verificado que el evento audiomerger:merge-completed y get result() transportan params
  (element:465/192 + DetalleAdvertencia.params en eventos.ts:52) — residual 1-2 de la
  4ª pasada CERRADOS.

Verificación de las correcciones declaradas:
1. (Params descartados en la tubería) RESUELTO y VERIFICADO en el camino del elemento REAL:
   - Tipos: ResultadoUI.warnings (reducer.ts:29) y DetalleAdvertencia (eventos.ts:52) con
     params opcional; MergeOutput ya lo tenía (types.ts:108).
   - Punto de ruptura corregido: element:456 `warnings: salida.warnings.map((w) =>
     ({ code, message, params: w.params }))` — MISMA forma en el evento (465) y en
     get result() (192): sin puntos de la tubería que descarten el dato.
   - EJECUTADO (t4): merge() público → estado con params → panel «(0:05)…(0:02)» sin
     tokens. El test nuevo del proyecto (ui-elemento.test.ts:176-204) cubre el camino del
     elemento (ResultadoUI → renderizarResultado → panel) exactamente como pedí en la
     condición de reapertura.
2. (Error no manejado residual en revocaciones) RESUELTO: revocarURL() con guarda
   `typeof URL.revokeObjectURL === 'function'` (element:1250-1252) usada por TODAS las
   revocaciones (grep: 0 llamadas directas restantes a URL.revokeObjectURL fuera del
   método; la única createObjectURL restante es la del resultado, element:447 — jsdom la
   cubre el test con su propio guard). Suite sin unhandled rejections/TypeErrors (0
   «Errors», exit 0).

DEFECTOS BLOQUEANTES: NINGUNO.

DEFECTOS NO BLOQUEANTES (residuales, ninguno cierra la fase):
1. Heredados ya declarados en pasadas anteriores, sin cambios ni regresión: clear/reset
   mid-job dejan estado final 'cancelled' con lista ya vacía (matiz de UX no documentado
   en rendering.md); avisoPendiente sin consumidor en la UI; marcarPistasInvalidas cubre
   solo details.ids (agregados); filas a 72px fijas en modo virtual (posible solape si el
   contenido desborda — cosmético, no verificado a fondo); doble t() en el sentinel de
   avisos (nit).
2. WheelEvent sintético no produce scroll nativo en Chromium (limitación del evento, no
   del código): el scroll físico con rueda real y el DnD con ratón siguen NO VERIFICADOS
   (scrollbar/End/teclado verificados porque scrollHeight=3960 y UN salto funciona). Repro
   F6 con input real vía CDP (Input.dispatchMouseEvent) o interactivo.
3. Motor WASM real dentro del componente (carga, progreso, cancelación en caliente,
   preescucha/descarga) NO VERIFICADO: demo/ vacía y dist/ inexistente — deuda declarada
   de FASE 6 (D-12). La sonda t4 usó motor simulado (etiquetado).
4. Matiz menor: mi sonda t3tris falló en esta pasada SOLO porque su propio mapeo descartaba
   params (artifacto del árbitro, no del código); alineada con element:456 pasa. El camino
   del elemento real quedó verificado por t4 (que nunca mapea a mano).

SALIDA REAL DE LAS EJECUCIONES (pegada literal):
$ cd /home/z/my-project/audio-merger && bun run test > /tmp/t.txt 2>&1; echo "exit=$?"; tail -4 /tmp/t.txt
exit=0

 Test Files  14 passed (14)
      Tests  190 passed (190)
   Start at  06:37:47
   Duration  5.80s (transform 437ms, setup 0ms, collect 827ms, tests 2.43s, environment 278ms, prepare 718ms)
(grep "Errors" /tmp/t.txt → 0; grep unhandled/TypeError → 0)

$ bun run typecheck 2>&1 | tail -3
$ tsc --noEmit
exit=0

Sonda t4 (camino del ELEMENTO real — mi condición de reapertura):
INFO | merge() → resuelta
INFO | warnings EN ESTADO: [{"code":"DURATION_MISMATCH","message":"…","params":{"obtenida":"0:05","esperada":"0:02"}}]
INFO | PANEL = "⚠ La duración del resultado (0:05) no coincide con la esperada (0:02). Revisa el audio antes de usarlo."
ok   | panel renderizado con tokens crudos = false

Sonda t3bis (agregado): "Formato no admitido: m4a" → ok | Sonda T1 (7 variantes): fugas 0
Sonda Chromium (55 pistas): {"espaciadorAlturaREAL":3960,"flexComputado":"0","listaScrollHeight":3960,"filasEnDom":11} | UN salto {"scrollTop":3480,"nums":"45,…,55"} | clear {"listaClient":56}

Stage Summary:
- VEREDICTO: FASE 5: APROBADA. El último bloqueante (params descartados en la tubería del
  elemento) está RESUELTO y verificado por ejecución propia del árbitro en el camino
  completo del elemento real (merge() público → estado → panel interpolado, cero tokens),
  más el test nuevo del proyecto por el mismo camino. El fix residual de revocaciones
  (revocarURL con guarda) también verificado: suite 190/190 EXIT 0 sin unhandled errors,
  typecheck estricto limpio.
- Balance de las 5 pasadas: la FASE 5 llegó a la aprobación con 7 bloqueantes originales
  (1ª), 3 residuales + 1 nuevo (2ª), 3 (3ª) y 1 (4ª), todos corregidos y re-verificados
  con las MISMAS sondas que los demostraron (incluida la de Chromium real para la
  virtualización: espaciador 3960px, scroll interno real, UN salto al final). Los
  residuales restantes son no bloqueantes y quedan rastreados para FASE 6.
- Deuda declarada que arrastra la fase (a verificar en F6): batería de navegador con motor
  WASM real (D-12), DnD físico con ratón y scroll con rueda real (CDP), demo/ y dist/
  inexistentes, y los no bloqueantes numerados arriba (1-4).

---
Task ID: 14
Agent: árbitro final adversarial (LISTÓN)
Task: Auditoría final adversarial del ENTREGABLE contra el LISTÓN (7 puntos + A–G), con ejecución propia

Work Log:
- Leído el worklog completo (fases 1–6 y las 15+ rondas de árbitros de fase con sus
  hallazgos y condiciones de reapertura) antes de tocar nada.
- EJECUTADO (Chromium real vía agent-browser, artefacto servido = public/, idéntico a dist/
  por cmp):
  · Ruta dorada cronometrada: t0 → «Cargar 3 audios de ejemplo» → filas → «Bajar
    tono-440-est.mp3» (orden verificado por API) → «Unir audios» → completed.
    Total medido 19.105,8 ms ≈ 19,1 s (< 60 s). Resultado: MP3 169.944 B, 7.050 ms, sin
    avisos, botón «Descargar · audio-unido-…mp3» + preescucha presentes.
  · Subida REAL de archivos por el input del shadow DOM (agent-browser upload con 2
    fixtures reales) → 2 pistas ready con duraciones reales → merge() → reencode
    145.493 B / 6.030 ms. download() interceptado: <a download href="blob:…">.
  · Selftest del motor en DOS sesiones (una con navegador recién lanzado): 12/12 PASS,
    terminado=true. Salida de una unión extraída del blob y validada FUERA del navegador:
    ffprobe mp3 44.100 Hz estéreo 6,06 s + ffmpeg decode exit 0.
  · Primer render de / (dos cargas frescas): 0 recursos /ffmpeg/, único script del widget
    audio-merger.umd.js; caso dedicado del selftest PASS.
- EJECUTADO (Node): bun run test → 191/191, exit 0, sin «Errors»; typecheck exit 0;
  lint del host exit 0. gzip UMD = 28.522 B (≤ 30 KB); ESM 32.239 B. Fixtures: 7 formatos
  + corrupto, ffprobe-OK por mí. WORKERFS grep -ao → 21. Greps de placeholders: solo
  falsos positivos del castellano «todo». D-01..D-14 leídos uno a uno: 14/14 con
  problema/coste/alternativa.
- HALLAZGO NUEVO (bloqueante, demostrado con 4 repros limpias en Chromium): la
  reconciliación de filas está ROTA para las eliminaciones — removeTrack() hace
  this.filas.delete(id) y clear() hace this.filas.clear() ANTES de renderizarLista(), y
  el único fila.remove() vive en el bucle de huérfanas que itera el mapa ya vaciado →
  los nodos li[data-id] quedan en el DOM para siempre. Evidencia: botón UI «Vaciar
  lista» → 0 pistas + 2 filas fantasma + «Aún no hay pistas» simultáneos (captura
  /tmp/ghost-rows-after-clear.png); clear+re-añadir → 5 filas para 2 pistas con
  numeración duplicada; removeTrack(r2) → la fila r2 persiste y el orden visible queda
  [r2, r1, r3]; botón ✕ de fantasma habilitado y no-op. Contradice rendering.md
  («borrado para ids fuera del orden»). La suite no lo detecta: los tests de removeTrack
  solo comprueban estado. Fix: quitar el pre-borrado del mapa (2 líneas) + tests jsdom
  que afirmen nº de filas === nº de pistas tras removeTrack y 0 filas tras clear().
- No bloqueantes nuevos: panel de error duplica el mensaje (am-error__titulo y
  __detalle reciben el mismo string); fallback 'mp3' cableado en el elemento
  (aplicarAtributos/estadoInicial) en vez de derivarlo del registro; README/page.tsx
  dicen «Pistas: sin límite práctico» frente a api.md (max-tracks por defecto 500).
- NO VERIFICADO (declarado, con repro): MT con COOP/COEP E2E (ST sí verificado: selftest
  12/12 con core autohospedado), prueba de humo de memoria, DnD físico/rueda real (CDP),
  build/fixtures/sync:demo (no ejecutados para no modificar artefactos), regeneración
  bit a bit OGG/Opus (serial aleatorio declarado; F1 la verificó con hashes),
  Firefox/Safari reales.
- Informe completo con todas las salidas reales y procedimientos de reproducción en
  audio-merger/INFORME_ARBITRO.md. Ningún otro archivo del proyecto fue modificado.

Stage Summary:
- VEREDICTO: ENTREGABLE: RECHAZADO (vuelve a FASE 5 — render de listas/reconciliación).
- Los 7 puntos del LISTÓN verificados UNO A UNO en verde por ejecución propia (ruta
  dorada 19,1 s; embed de 2 etiquetas sin pasos ocultos; 191/191 + fixtures 7 formatos +
  corrupto + selftest 12/12 con duraciones y sniffers reales; greps limpios; 14/14
  decisiones; UMD gzip 28.522 B; WASM nunca en el arranque + caso dedicado PASS).
- Único bloqueante: filas fantasma tras removeTrack()/clear() (corrupción visible del UI
  en flujo primario + afirmación de rendering.md refutada + botones muertos; mismo
  estándar con el que el árbitro F5 bloqueó el defecto N1, menos grave que este).
  Fix de ~2 líneas + 2 tests. Condición de reapertura: corregido el bloqueante (idealmente
  también los 3 no bloqueantes), re-ejecutar las repros del defecto, `bun run test`
  (exit 0) y una pasada del selftest; el resto del listón ya está verificado en verde y
  no requiere re-ejecución.

---
Task ID: 14
Agent: árbitro final adversarial (LISTÓN, re-auditoría — Ronda 2)
Task: Verificación del fix del bloqueante (filas fantasma) + 3 no bloqueantes; re-emisión del veredicto final

Work Log:
- Verificado el estado del artefacto: dist/ y public/audio-merger/audio-merger.umd.js
  reconstruidos (07:26) e idénticos (cmp); gzip del servido = 28.524 B (≤ 30 KB; el autor
  reportó 28.622 B — discrepancia trivial de medición, ambas bajo presupuesto).
- Código del fix leído: removeTrack() ya NO borra de this.filas y clear() ya NO vacía el
  mapa (comentarios citan la regresión); el bucle de huérfanas/rama vacía de
  renderizarLista() es el único dueño del DOM de filas. Test de regresión nuevo en
  tests/ui-elemento.test.ts:206 con las aserciones exactas que prescribí (filas === pistas
  tras removeTrack; 0 filas + .am-vacia tras clear).
- REPROS ORIGINALES re-ejecutadas en Chromium real (navegador fresco, artefacto servido):
  · R1 API: 3 pistas/3 filas → removeTrack(2ª) → 2/2, orden visible [g1, g3] (antes 3
    filas y [r2, r1, r3]); clear() → 0 pistas/0 filas/0 li[data-id] + «Aún no hay pistas»
    SIN fantasmas (antes 2 fantasmas + mensaje simultáneos).
  · R2 UI (flujo primario): botón «Vaciar lista» → 0/0/0 + .am-vacia (antes 2 fantasmas).
  · R3 acumulación: clear→add(α,β)→2/2; clear→add(γ)→1/1 [gamma] (antes 5 filas para 2
    pistas con numeración duplicada).
  · R4 virtualización: 60 pistas → EXACTAMENTE 11 filas (antes 14 = 11+3 fantasmas),
    scrollHeight 4320 = 60×72 exacto (antes 4533 contaminado), UN salto al final →
    scrollTop 3840 (filas 50–60); clear tras virtualizar → 0 filas + espaciador 0px/none
    (regresión N1 de F5 sigue cubierta).
  · Subida REAL por el input del shadow DOM tras clear() → 2 pistas/2 filas exactas →
    merge() → reencode 145.493 B / 6.030 ms / sin avisos.
- No bloqueantes verificados: NB1 panel de error sin duplicado (título = mensaje de
  usuario; detalle = err.message técnico con números exactos, verificado en Chromium con
  max-tracks="muchos"); NB2 formato por defecto desde el registro
  (formatosSalidaRegistrados()[0]?.id ?? 'mp3', residual trivial: literal 'mp3' de
  bootstrap en estadoInicial:56); NB3 README:139 «500 por defecto (configurable)»
  (residual trivial: page.tsx:55 de la demo conserva «Sin límite práctico» — copy del host,
  no contrato).
- Condición de reapertura ejecutada al completo: bun run test → 192/192 en 14 ficheros,
  exit 0, sin «Errors»; typecheck exit 0; selftest re-ejecutado → 12/12 PASS con
  terminado=true; ruta dorada re-cronometrada (cargar ejemplos → «Bajar voz-sim.wav» →
  «Unir audios») → completed en 10,6 s (< 60 s), MP3 242.042 B / 10.060 ms sin avisos, botón
  Descargar presente; dev.log del host con 0 errores durante toda la sesión.
- Sin defectos nuevos en ninguna sonda (reconciliación, panel de error, upload real, merge,
  virtualización, clear post-virtualizar, ruta dorada, selftest, suite, typecheck, gzip,
  sync dist↔public). Inventario NO VERIFICADO de la Ronda 1 sin cambios (todos con repro
  declarado: MT/COOP-COEP, humo de memoria, DnD físico, build/fixtures/sync solo por el
  autor, OGG/Opus bit a bit, Firefox/Safari).
- Informe actualizado: INFORME_ARBITRO.md — nueva sección «Ronda 2 del árbitro final» con
  la verificación del fix, el conteo total del loop (16 rondas: F1×3, F2×2, F3×2, F4×2,
  F5×5, final×2) y el veredicto final. Ningún otro archivo del proyecto fue modificado.

Stage Summary:
- VEREDICTO FINAL (Ronda 2): ENTREGABLE: APROBADO ✅.
- El único bloqueante de la Ronda 1 (filas fantasma en removeTrack()/clear()) está RESUELTO
  y verificado con las MISMAS repros que lo demostraron (más la variante de virtualización,
  ahora sin contaminación de métricas: scrollHeight exacto 4320) + test de regresión en la
  suite. Los 3 no bloqueantes resueltos. Los 7 puntos del LISTÓN quedaron verificados en
  verde en la Ronda 1 y nada de lo re-ejecutado ha regresado.
- El proyecto cierra con: core puro 192/192, motor verificado E2E en Chromium (selftest
  12/12), extensibilidad demostrada en navegador (OPUS entrada / OGG salida / fundido),
  embed de 2 etiquetas en demo real, UMD 28,5 KB gzip, WASM jamás en el arranque, 14/14
  decisiones con problema/coste/alternativa, honestidad epistémica mantenida (no-verificados
  declarados con procedimiento) y 16 rondas de auditoría adversarial registradas.

---
Task ID: 16
Agent: árbitro final adversarial (instalador nativo)
Task: Auditoría final adversarial del ENTREGABLE NATIVO (app Windows x64 + instalador NSIS
en download/) contra el pedido literal del usuario, con ejecución propia de todo lo verificable

Work Log:
- Leído el worklog completo (estándar de las 16 rondas previas) antes de tocar nada.
- SUITE REAL ejecutada: `go test ./internal/audio/ -count=1 -v -timeout 300s` → 25 RUN /
  25 PASS / 0 FAIL / 0 SKIP, exit 0, 1,913 s. El único skip posible (falta ffmpeg) NO se
  activó; los tests usan fixtures ffmpeg reales y validan con ffprobe + decodificación.
- LISTÓN punto por punto: (a) download/FusionadorDeAudio-Setup-1.0.0-x64.exe existe,
  Nullsoft self-extracting real, 1.074.694 B, 7 secciones, byte-idéntico a installer/ (md5
  087aa872…); (b) dist/FusionadorDeAudio.exe = PE32+ x86-64 GUI 9 secciones; recompilado
  por el árbitro con CGO_ENABLED=0 GOOS=windows GOARCH=amd64 -trimpath
  -ldflags "-s -w -H windowsgui" → BYTE-IDÉNTICO (md5 428c7d85…); imports solo
  kernel32/GetProcAddress; manifest asInvoker/comctl32 v6/UTF-8 + VS_VERSIONINFO embebidos
  verificados en el binario; (c) .nsi leído COMPLETO: solo instala FusionadorDeAudio.exe +
  LICENSE.txt + LEEME.txt (nada más); makensis v3.11-1 ejecutado por el árbitro sobre copia
  con mtimes preservados → instalador BYTE-IDÉNTICO al entregado, exit 0, CERO warnings →
  el entregado es EXACTAMENTE el .nsi actual (contenido probado, no declarado); (d) el
  binario instalado es x64; el stub i386 del instalador es la norma NSIS y no afecta al
  requisito (juzgado no-problema).
- MOTOR adversarial: resampler streaming verificado algebraica y empíricamente (duraciones
  EXACTAS); WAVE_FORMAT_EXTENSIBLE con offsets de GUID correctos (verificados contra
  hexdumps reales de ffmpeg, decodifica 5.1 + LIST + fact con duración exacta); ventana
  Xing/Info/VBRI: 0 falsos positivos en 374 frames reales escaneados con parser propio
  (las 13 coincidencias eran los Info reales del primer frame) + argumento cuantitativo
  (~10⁻⁸/frame); truncados MP3 detectados con byte EXACTO (5686/44/2865) en ambos modos.
- EXTRA ADVERSARIAL (sonda Go propia vía `go build -overlay`, CERO bytes escritos en el
  proyecto): fusión 8-bit/8000 mono + float32/384000 estéreo + MP3 22050 mono → salida
  3,097250 s (esperado 3,097; ffprobe + decodificación limpia); extensible 5.1 + MP3 +
  WAV/LIST → 2,497 s exacto; copia MP3 con descarte real del frame Info de cada entrada
  (sin Info/Xing/ID3 en la salida, 45 frames exactos); WAV 0 B y MP3 2 B →
  UNSUPPORTED_FORMAT limpio; heterogéneos → PARAM_MISMATCH castellano; dir. inexistente →
  WRITE_FAILED castellano.
- DOS DEFECTOS REALES no bloqueantes (con repro y fix sugerido en el informe): D1 — WAV
  con data declarado mayor que el físico se fusiona EN SILENCIO más corto (decWav.Leer
  trata ErrUnexpectedEOF como EOF limpio); D2 — MP3 con tag ID3v1 final rompe el modo
  copia con «frame MP3 inválido» engañoso (el bucle de copia no tolera la cola ≤4096 que
  sí tolera el escáner; en salida WAV el mismo archivo fusiona OK).
- GUI Win32: compilada (windows/amd64) pero NO ejecutada aquí (declarado con repro de VM);
  auditoría estática completa: LVM_*W/LVN_ITEMCHANGED/PBM_SETRANGE32-SETPOS/OFN/estructuras
  amd64 (OPENFILENAMEW 152 B etc.) todas correctas; NewCallback sin fuga GC; worker solo
  PostMessage y mutex sin retener en esperas → sin deadlocks; WM_CLOSE durante fusión
  espera al worker correctamente; govet app.go:206 = falso positivo estándar de WndProc.
- Decisiones D-01..D-15 leídas una a una: 15/15 con problema/coste/alternativa; licencias
  de dependencias verificadas en el module cache (Apache-2.0/MIT/Unlicense); icon.ico
  regenerado byte-idéntico (determinista, 6 tamaños). D-12/README «GUI→i18n 100%» queda
  ligeramente inflada: 5 literales de UI viven en el gui (todos en castellano, requisito
  de idioma cumplido) y 4 claves de es.go están muertas.
- README contrastado afirmación a afirmación: todo lo «verificado» es cierto por mi propia
  ejecución; lo «no verificado» (ejecución real de GUI/instalador) está honestamente
  declarado. Sin inflado material.
- Worklog del autor (Task 15, app nativa): TODAVÍA NO apendado al final (no bloqueante;
  se espera tras este informe). Aviso: ya existe un «Task ID: 15» histórico de la web en
  la línea 252 — que el autor distinga su nueva sección para no duplicar ID.
- Informe completo con todas las salidas reales y repros en
  audio-merger-native/INFORME_ARBITRO_NATIVO.md. Ningún otro archivo del proyecto fue
  modificado (compilaciones y sondas en /tmp, vía overlay sin escritura en el repo).

Stage Summary:
- VEREDICTO: ENTREGABLE: APROBADO ✅.
- Listón literal del usuario verificado 4/4 por ejecución propia: instalador NSIS real en
  download/ (reproducido byte a byte por el árbitro desde el .nsi, 0 warnings), programa
  nativo PE32+ x64 GUI en Go puro sin cgo (reproducido byte a byte), instalación por
  usuario con ÚNICAMENTE la herramienta (exe + LEEME + LICENSE), binario instalado x64.
- Motor 25/25 + batería adversarial del árbitro con duraciones exactas y errores limpios,
  tipados y en castellano. Defectos no bloqueantes a abordar en la siguiente pasada: D1
  (WAV truncado silencioso), D2 (ID3v1 en modo copia), centralización i18n al 92% y nits
  de higiene de repo; ejecución real en Windows queda declarada no verificada con repro.

---
Task ID: 17
Agent: orquestador principal (Z.ai Code) — autor del nativo
Task: App NATIVA Windows x64 «Fusionador de Audio» + instalador .exe en download/ (Task del usuario; ID renumerado a 17 porque el 15 histórico quedó tomado por la fase web y el 16 lo usó el árbitro del nativo; el trabajo del autor se ejecutó ANTES del Task 16)

Work Log:
- Sondado el entorno: sin Go/Rust/NSIS/sudo; internet OK (dl.google.com 200). Instalados
  toolchains de usuario: Go 1.27.3 (tarball en /home/z/toolchain/go) y NSIS 3.11
  (apt-get download + dpkg-deb -x sin root, con NSISDIR). Prueba de humo real: Go
  cross-compila PE32+ GUI x64; makensis genera instalador Nullsoft.
- Proyecto en audio-merger-native/: motor portable (internal/audio) + GUI Win32 por
  syscalls (internal/gui, //go:build windows) + config/i18n castellano + 15 decisiones
  (docs/decisions/D-01..D-15, problema/coste/alternativa).
- Motor: WAV propio (PCM 8/16/24/32 + float32 + WAVE_FORMAT_EXTENSIBLE), MP3
  (go-mp3 Apache-2.0 + escáner de frames propio con detección de truncados y descarte
  de Xing/Info/VBRI), OGG/Vorbis (oggvorbis MIT), FLAC (flac Unlicense); fusión WAV
  normalizada streaming (float32, remuestreo lineal, conversión de canales) y MP3 modo
  copia (concat de frames, homogeneidad obligatoria); escritura atómica temporal+rename;
  errores tipados con códigos estables; límites centralizados.
- Tests reales en Linux (fixtures ffmpeg CLI, salidas ffprobe + decodificación real):
  25/25 PASS tras loop de fixes (GUID extensible, amplitud fixtures, duración MP3 por
  decodificación, truncado a mitad de frame, vet limpio).
- GUI: ventana/clase/menús/aceleradores/ListView/Combo/ProgressBar/StatusBar/GetOpenFileNameW
  multiselección/GetSaveFileNameW/WM_DROPFILES/menú contextual/worker con PostMessage y
  cancelación. Compila para windows/amd64 (vet limpio salvo falso positivo documentado
  del patrón lParam Win32).
- Recursos PE con goversioninfo: icono programático (tools/genicon, teal/ámbar, 6
  tamaños), manifiesto (comctl32 v6, dpiAware, UTF-8, asInvoker) y VERSIONINFO.
- Instalador NSIS en español (MUI2): por usuario ($LOCALAPPDATA\Programs), sin UAC,
  ÚNICAMENTE la herramienta (exe + LEEME.txt + LICENSE.txt), atajos, desinstalador HKCU.
- Ejecutado ./build.sh (reproducible de 6 pasos) → dist/FusionadorDeAudio.exe (PE32+
  x64 GUI, 2,6 MB, 9 secciones) → installer/FusionadorDeAudio-Setup-1.0.0-x64.exe
  (1,07 MB LZMA) → copiado a /home/z/my-project/download/ (md5 91d69b6e…).
- Árbitro (Task 16): VEREDICTO APROBADO ✅ tras verificar por ejecución propia la
  suite, el PE, la recompilación byte-idéntica del exe y del instalador, la fusión
  manual adversarial y las decisiones 15/15. Halló 2 no bloqueantes (D1 WAV truncado
  silencioso, D2 ID3v1 rompía copia) + 5 literales dispersos + .syso huérfanos.
- Fixes post-árbitro: D1 (validación data>disponible → DECODE_FAILED), D2 (cola
  ≤4096 tolerada en copia), literales movidos a i18n/es.go, .syso huérfanos borrados,
  build.sh corregido (GOOS por paso). Regresiones nuevas D1/D2 en la suite → 27/27
  PASS; build completo re-ejecutado y download/ regenerado (md5 91d69b6e…).

Stage Summary:
- ENTREGADO: download/FusionadorDeAudio-Setup-1.0.0-x64.exe (instalador NSIS español,
  por usuario, únicamente la herramienta). Binario interno nativo PE32+ x64 GUI Go puro.
- Motor verificado 27/27 en Linux con ffmpeg/ffprobe reales; árbitro independiente
  APROBADO con repro completa (INFORME_ARBITRO_NATIVO.md); no bloqueantes corregidos
  y re-verificados.
- NO VERIFICADO (declarado con repro): ejecución de GUI/instalador en Windows real
  (sin Windows en este entorno) — VM Windows 10/11 x64: instalar, añadir 2 MP3,
  fusionar, reproducir salida, comprobar atajos/desinstalación.

---
Task ID: 18
Agent: orquestador principal (Z.ai Code) — fix 1.0.1 del cuelgue reportado por el usuario
Task: Bugfix de la app nativa: «el programa instalado en pc no funciona, simplemente se
cuelga al intentar cargar cualquier audio» (reporte real de usuario en Windows; la 1.0.0
nunca se ejecutó aquí — estaba declarado NO VERIFICADO, y efectivamente falló en real).

Work Log:
- Entorno recreado (toolchain Go/NSIS borrada): re-descargados Go 1.27.3 (tarball) y
  NSIS 3.11-1 (dos .deb de Debian, dpkg-deb -x sin root) en /home/z/toolchain.
- Diagnóstico del cuelgue: el bucle de mensajes Win32 corría SIN runtime.LockOSThread().
  Win32 reparte los mensajes de una ventana SOLO al hilo que la creó; el runtime de Go
  puede migrar la goroutine a otro hilo tras syscalls bloqueantes (GetMessageW en reposo,
  GetOpenFileNameW modal de «Añadir audios…»), y al migrar, la cola deja de bombearse →
  congelado total exactamente al cargar audio. Coincide con el fallo canónico Go+Win32.
  La auditoría estática 1.0.0 (incl. árbitro Task 16) lo pasó por alto: es un invariant
  de runtime, no del código Win32 visible. Motor descartado como causa (probe WAV/OGG/
  FLAC es cabecera-only; MP3 escanea frames pero avanza siempre ≥4 bytes → finito).
- Fix D-16 (docs/decisions/D-16-bloqueo-hilo-os.md): runtime.LockOSThread() en main()
  y en gui.Ejecutar() antes de crear ventana alguna. Sin cambios de motor/UI/instalador.
- Versión 1.0.0 → 1.0.1 en cadena: config/defaults.go, versioninfo.json (Fixed+Strings),
  app.manifest, installer/audio-merger.nsi, README (nota de fix + estado honesto).
- ./build.sh re-ejecutado completo con toolchain restaurada: motor 27/27 PASS (0 fail,
  0 skip); icono regenerado; goversioninfo 1.7.0 → .syso con VERSIONINFO 1.0.1.0;
  dist/FusionadorDeAudio.exe PE32+ x64 GUI 9 secciones (2.630.144 B); makensis 3.11 →
  installer/FusionadorDeAudio-Setup-1.0.1-x64.exe (1.074.976 B, 7 secciones); copiado a
  download/. «1.0.1.0» verificada embebida en ambos PE (strings -e l). go vet windows:
  limpio salvo el falso positivo documentado (lParam WndProc, app.go:215 tras el fix).
- Higiene: instaladores 1.0.0 eliminados de installer/ y download/ para impedir
  reinstalaciones del build roto.

Stage Summary:
- ENTREGADO: download/FusionadorDeAudio-Setup-1.0.1-x64.exe (md5 027ea5d640bff6698fcbd6f47a3836bb).
- Causa raíz del cuelgue identificada y corregida (D-16, LockOSThread); motor intacto y
  27/27; build reproducible de 6 pasos en verde de extremo a extremo.
- NO VERIFICADO (sin Windows aquí): ejecución real de la GUI 1.0.1 — el usuario debe
  reinstalar y probar (desinstalar la 1.0.0 primero o instalar encima; mismo ID de
  instalación). Si volviera a colgar, pedir formato exacto + tamaño del archivo y si el
  diálogo llegó a abrirse, para seguir el diagnóstico.

---
Task ID: 19
Agent: subagente árbitro adversarial independiente — auditoría del bugfix 1.0.1 (Task del usuario; audita la Task 18)

Work Log:
- Fix verificado por lectura + git diff -w: LockOSThread() en cmd/audio-merger/main.go:21 y
  internal/gui/app.go:82, ANTES de RegisterClass/CreateWindow; sin NINGÚN otro cambio semántico
  (motor 0 líneas; GUI 0; nsi/versioninfo/manifest/defaults solo versión). Sin otros puntos de
  entrada sin lock (worker solo PostMessage).
- Diagnóstico validado adversarialmente: Win32 entrega mensajes solo al hilo creador; goroutine
  del bucle migra tras GetOpenFileNameW/GetMessageW bloqueantes → SendMessage cruzado a ventana
  sin bombear → congelado permanente exactamente «al cargar audio». Búsqueda de causas
  alternativas (OPENFILENAMEW 152 B con 23 offsets exactos por aserciones de compilación con
  overlay; bucles de sonda MP3 siempre avanzan ≥4 B → finitos; WAV/OGG/FLAC cabecera-only):
  ninguna otra causa de cuelgue infinito.
- Ejecuciones propias: build a /tmp → exe byte-idéntico a dist/ (md5 40a1be09…, PE32+ x64 GUI,
  9 secciones, 2.630.144 B); instalador reproducido en /tmp → byte-idéntico (md5
  027ea5d640bff6698fcbd6f47a3836bb = installer/ = download/ = declarado); go vet windows: único
  aviso app.go:215:32 (el falso positivo documentado, línea exacta); tests motor 27 RUN /
  27 PASS / 0 FAIL / 0 SKIP (ok 1,989 s); cadena 1.0.1 verificada en 5 fuentes + ambos PE
  (strings -e l «1.0.1.0» ×2, cero 1.0.0 activos); .syso regenerado (mtime + VERSIONINFO).
- Worklog Task 18 contrastado afirmación a afirmación: TODO exacto (md5, bytes, secciones,
  27/27, línea vet, higiene de instaladores 1.0.0 eliminados). Sin inflado ni engaño.
- Residuales NO bloqueantes declarados: congelado TEMPORAL finito (segundos) del hilo UI con
  MP3 enormes (sonda O(bytes), hasta 512 MiB); no-op silencioso si la multiselección desborda
  el buffer del diálogo (FNERR_BUFFERTOOSMOLD tratado como cancelar); esperarWorker bloquea el
  bombeo brevemente al salir durante fusión; 4 claves i18n muertas y repo no gofmt-clean
  (preexistentes de 1.0.0); re-indentación tab→espacios no declarada (cosmética).
- NO VERIFICADO (sin Windows aquí): ejecución real de la GUI 1.0.1. Repro: VM Windows 10/11
  x64 → instalar (encima de 1.0.0 o tras desinstalar; mismo IDINST, NSIS validado) → añadir
  MP3/WAV/OGG/FLAC → fusionar WAV y MP3 → cancelar → desinstalar. Caso límite: MP3 ≥300 MB.
- Informe completo con salidas reales en
  audio-merger-native/INFORME_ARBITRO_FIX_1_0_1.md. Nada más del proyecto fue modificado.

Stage Summary:
- VEREDICTO: BUGFIX 1.0.1 APROBADO ✅. Causa raíz correcta y corregida con cambio mínimo;
  entregables regenerados de verdad (rebuild byte-idéntico de exe e instalador desde las
  fuentes actuales); honestidad del worklog 100 % confirmada por medición propia.
- Pendiente solo lo no ejecutable aquí: repro en Windows real (§8/§9 del informe).

Task ID: 20
Agent: orquestador — implementación del bugfix 1.0.2 (entrada diferida: se escribe tras la
Task 21 por orden de finalización; la cronología real de ejecución fue 20 → 21)

Work Log:
- Reporte del usuario tras 1.0.1: «ya no se colgo pero no me mostro por ningun lado que cargo y
  luego al presionar fusionar se mesclo en desorden pues no pudi elegir el orden».
- Diagnóstico (D-17): dos constantes LVM mal transcritas en win32.go desde la 1.0.0:
  LVM_SETITEMW=+78 (real: LVM_GETTOOLTIPS; correcto +76) → textoItem(sub≥1) jamás escribía
  Nombre/Formato/Duración/Info (la lista solo mostraba la columna «#»); LVM_SETITEMSTATE=+75
  (real: LVM_GETITEMW; correcto +43) → la selección programática nunca surtía efecto. Con eso,
  la fusión corría con el orden alfabético del diálogo multiselección → «se mezcló en desorden».
- Fixes: constantes +76/+43; moverSeleccion reescrito con marcas posicionales (el algoritmo viejo
  fallaba en bloques contiguos ≥ 2 por usar índices obsoletos); auto-selección de la última pista
  añadida (feedback visible de «cargó»); arrastre interno de reordenación (D-18: LVN_BEGINDRAG →
  SetCapture en el padre → WM_MOUSEMOVE/LVM_SETINSERTMARK → WM_LBUTTONUP reordena; sin OLE ni
  subclases); HintOrden en la barra de estado con 2+ pistas.
- Cadena 1.0.2 completa + build.sh en verde + higiene de instaladores 1.0.1.

Stage Summary:
- ENTREGADA 1.0.2 (md5 instalador 838f6396fb57b0d552c38a3b27dad594)… RECHAZADA después por la
  auditoría Task 21 (H2/H3 reales: GETITEMRECT +15 y LVINSERTMARK sin CbSize; H1 resultó ERRÓNEA
  y se refutó en la Task 22 con la cabecera real de wine). Correcciones aplicadas como 1.0.3.
- Honestidad: el fix de constantes fue verificado por lectura propia, pero dos valores NUEVOS de
  la misma familia se colaron (H2/H3) — detectados por el árbitro, no por mí. Lección registrada
  en D-19: las tablas de memoria NO son fuente de verdad; la cabecera real sí.

Task ID: 21
Agent: subagente árbitro adversarial independiente — auditoría del bugfix 1.0.2 (Task del usuario; audita la Task 20)

Work Log:
- Changeset verificado por lectura + git diff: coincide 1:1 con lo declarado (win32.go +76/+43 y
  constantes/procs/structs nuevos; arrastrar.go nuevo; app.go/controles.go/dialogos.go/es.go;
  versiones 1.0.2 en defaults/versioninfo/manifest/nsi/README/leeme; docs D-17/D-18). Motor:
  git diff HEAD -- internal/audio/ = 0 LÍNEAS. Valores viejos confirmados con git show HEAD
  (SETITEMW=+78, SETITEMSTATE=+75). Matiz cosmético no declarado: re-indentación tab→espacios de
  win32.go/es.go (606/255 líneas crudas vs 36/1 semánticas). El worklog aún no tiene sección
  «Task ID: 20» (los claims auditados vinieron en el encargo).
- Constantes contrastadas contra commctrl.h por reconstrucción (sin copia local ni internet):
  correctas las corregidas (+76/+43), correctas INSERTITEMW +77 / INSERTCOLUMNW +97 / GETNEXTITEM
  +12 / HITTEST +18 / SETINSERTMARK +166 / LVN_BEGINDRAG -109 / WM_MOUSEMOVE 0x200 /
  WM_LBUTTONUP 0x202 / WM_CAPTURECHANGED 0x215 / LVIR_BOUNDS 0. HALLAZGOS PROPIOS: (H1, ALTO,
  preexistente no corregido) LVM_GETSELECTEDCOUNT=+50 — canónico +48 (serie contigua canónica
  43..49 forzada por anclajes 0x102B/0x102F/0x1031) ⇒ refrescarBotones siempre ve 0 seleccionados
  ⇒ botones Subir/Bajar/Quitar NUNCA se habilitan en 1.0.2 (drag y Alt+↑/↓ sí funcionan, no
  dependen de ella); (H2, MEDIO, nuevo) LVM_GETITEMRECT=+15 — canónico +14 (+15 es LVM_SETITEMPOS)
  ⇒ el refinamiento «mitad inferior de la fila» jamás se aplica (apuntado más grueso, funcional);
  (H3, MEDIO, nuevo) LVINSERTMARK sin cbSize inicial (canónica 12 B, código 8 B) ⇒
  LVM_SETINSERTMARK falla la validación de cbSize ⇒ la marca de inserción JAMÁS se pinta;
  (H4, BAJO) re-entrada por teclado durante drag (mover/quitar/añadir no consultan a.arrastrando;
  bounds-checks evitan crash). Nota: la tabla «canónica» del informe 1.0.0 (Task 16) bendecía
  +78, +75 y +50 — demostradamente no fiable.
- Estructuras por aserciones EN COMPILACIÓN (main propio en /tmp, GOOS=windows GOARCH=amd64,
  CERO bytes del repo): RECT=16; LVHITTESTINFO=24 (Flags@8, IItem@12); LVITEMW=72 (PszText@24,
  LParam@40); LVCOLUMNW=40; NMLISTVIEW=64 (IItem@24); NMHDR=24; LVINSERTMARK(código)=8. OK.
- Lógica de reordenación replicada y EJECUTADA en /tmp: moverMarcas 12/12 casos OK (simple,
  extremos, bloques 2-3, no contiguas, ambas direcciones, re-selección correcta);
  soltarArrastre 11/11 OK (i<j, i>j, extremos 0/n, no-ops, guards). Algoritmo VIEJO 1.0.1
  replicado: falla bloques contiguos ≥2 en ambas direcciones («índices obsoletos» CIERTO), pero
  también movía bien las no contiguas (claim «solo selección simple» impreciso).
- Ejecuciones propias: build con las flags exactas de build.sh → /tmp/arb1202.exe BYTE-IDÉNTICO
  a dist/FusionadorDeAudio.exe (md5 002c73c2985943aaa48ed09bf1957139 = declarado; PE32+ x64 GUI,
  9 secciones, 2.636.288 B); instalador reproducido en /tmp (cp -p, makensis v3.11-1) →
  BYTE-IDÉNTICO (md5 838f6396fb57b0d552c38a3b27dad594 = installer/ = download/ = declarado;
  Nullsoft SFX, 7 secciones, 1.076.693 B); cadena temporal icono→syso→exe→instalador→download
  coherente. go vet windows: exactamente 2 avisos, app.go:220:32 y 227:55 (líneas y columnas
  exactas a lo declarado, falso positivo lParam WM_NOTIFY); tests motor 27 RUN / 27 PASS /
  0 FAIL / 0 SKIP (ok 2,077 s, ffmpeg 7.1.5); cadena 1.0.2 en 5 fuentes + «1.0.2.0» ×2 UTF-16
  en ambos PE y en el .syso, 0 restos de 1.0.1.0; instaladores 1.0.1 eliminados (solo 1.0.2 en
  installer/ y download/).
- Contraste de síntoma: D-17 explica el reporte (columnas de datos vacías ⇒ «no mostró que
  cargó» — con matiz: la columna «#» con números y la barra de estado SÍ mostraban algo;
  re-selección rota + orden alfabético de GetOpenFileNameW ⇒ «no pude elegir el orden» /
  «se mezcló en desorden»), pero es INCOMPLETO: H1 explica igualmente los botones muertos y
  sigue sin corregirse. Causas alternativas descartadas (creación ListView, columnas +97,
  WM_NOTIFY): ninguna plausible.
- D-16 intacto: LockOSThread primera sentencia de main() (main.go:21) y Ejecutar() (app.go:87);
  estado del arrastre solo tocado desde wndProc (mismo hilo); worker solo PostMessage; WM_NOTIFY
  con switch, orden soltarArrastre (arrastrando=false antes de ReleaseCapture) correcto.
- NO VERIFICADO (sin Windows aquí): ejecución real de la GUI 1.0.2 — H1/H2/H3 son predicciones
  de alta confianza (92-96 %) pendientes del experimento decisivo de la repro (botones grises con
  selección manual ⇒ H1 confirmada). commctrl.h original no disponible: valores canónicos por
  reconstrucción aritmética del encabezado. Repro completa en §8 del informe.
- Informe completo con salidas reales en
  audio-merger-native/INFORME_ARBITRO_FIX_1_0_2.md. Nada más del proyecto fue modificado.

Stage Summary:
- VEREDICTO: BUGFIX 1.0.2 RECHAZADO ❌ como release (aprobar tras 1.0.3 correctora). La logística
  es impecable y sin inflado (rebuild byte a byte de exe e instalador, 27/27, vet exacto, cadena
  de versión completa), pero el fix de «constantes mal transcritas» deja una tercera sin corregir
  (LVM_GETSELECTEDCOUNT +50→+48 ⇒ botones Subir/Bajar/Quitar muertos, prometidos en README/leeme
  actualizados en esta misma release) e INTRODUCE dos errores nuevos de la misma familia en el
  código del arrastre (LVM_GETITEMRECT +15→+14; LVINSERTMARK sin cbSize ⇒ marca de inserción
  jamás visible). Exigencias para 1.0.3: esas 3 correcciones + guard !arrastrando en
  mover/quitar/añadir/vaciar + re-auditoría de TODAS las constantes LVM/WM contra commctrl.h real
  (la tabla de la Task 16 no es fiable). Con eso la reaprobación sería inmediata.


Task ID: 22
Agent: orquestador — correcciones 1.0.3 (respuesta al rechazo de la Task 21; entrada diferida,
se escribe tras la Task 23 por orden de finalización)

Work Log:
- FUENTE DE VERDAD CAMBIADA: descargué la cabecera REAL commctrl.h del mirror de wine
  (raw.githubusercontent.com/wine-mirror/wine) y contrasté cada valor mecánicamente:
  LVM_GETSELECTEDCOUNT = LVM_FIRST + 50 (H1 del árbitro REFUTADA: +48 es LVM_SORTITEMS, +49 es
  LVM_SETITEMPOSITION32, +51 GETITEMSPACING — aplicar su corrección habría ROTO los botones);
  LVM_GETITEMRECT = +14 (H2 confirmada, corregida de mi +15); LVINSERTMARK = {cbSize; dwFlags;
  iItem; dwReserved} 16 B con LVIM_AFTER=0x1 (H3 confirmada y MÁS completa de lo que el árbitro
  pedía: su «canónica» de 12 B/3 campos también era imprecisa — la real lleva dwReserved).
- Correcciones aplicadas: GETITEMRECT +14; LVINSERTMARK canónica con CbSize relleno en ponerMarca
  (único punto de envío) y DwFlags/LVIM_AFTER; guards `fusionando || arrastrando` en anadirArchivos,
  quitarSeleccion, moverSeleccion, vaciar, iniciarFusion y menuContextual (H4); eliminada la
  constante muerta LVM_GETITEMCOUNT (H5); D-17 corregida (el matiz «+78 inexistente» → «+78 es
  LVM_GETTOOLTIPS») y D-19 nueva (incluye la refutación documentada de H1).
- Cadena 1.0.3 (defaults/versioninfo/manifest/nsi/README) + build.sh en verde: motor ok (27 tests,
  0 diff en internal/audio), exe PE32+ x64 GUI (md5 690b75a96b839c84c3b6da572848639a), instalador
  NSIS (md5 a90f7ecf4885221c8faa4e98f8fb03f2) = copia download/ idéntica; «1.0.3.0» ×2 en cada
  PE, 0 restos de 1.0.2; instaladores 1.0.2 eliminados; go vet: solo los 2 falsos positivos
  documentados (app.go:220/227, patrón lParam WM_NOTIFY).

Stage Summary:
- ENTREGADO: download/FusionadorDeAudio-Setup-1.0.3-x64.exe (md5 a90f7ecf4885221c8faa4e98f8fb03f2),
  aprobado por la re-auditoría adversarial Task 23 (rebuild byte-idéntico de exe e instalador).
- Deuda aceptada (H6 del árbitro 23, preexistente, impacto funcional CERO porque LVM_SETITEMSTATE
  ignora Mask): LVIF_STATE=0x2 en el código vs canónico 0x8 — se corrige en la próxima release que
  toque win32.go, para no invalidar el binario auditado. Nota menor: soltarArchivos sin guard
  `arrastrando` (hueco teóricamente inalcanzable durante un arrastre interno).
- NO VERIFICADO (sin Windows aquí): ejecución real de la GUI 1.0.3 — repro del usuario pendiente
  (añadir audios → ver nombre/duración + resaltado → reordenar arrastrando y con botones →
  fusionar y comprobar el orden). Si algo falla, pedir detalle del síntoma para el siguiente ciclo.


## Task ID: 23 — Árbitro adversarial 2 (bugfix 1.0.3): VEREDICTO APROBADO ✅

Auditoría independiente de la 1.0.3 (respuesta del autor, Task 22, al rechazo de la 1.0.2).
Cero bytes del repo tocados (informe + esta sección únicamente); sondas en /tmp.

- Disputa H1 resuelta con fuente autoritativa PROPIA: descargué commctrl.h del mirror de
  wine (5.586 líneas, md5 b6ccf348b811d4416f4128c411837cf7) y grep mecánico propio:
  l.3332 LVM_SORTITEMS=(+48), l.3334 LVM_SETITEMPOSITION32=(+49), l.3335
  LVM_GETSELECTEDCOUNT=(+50), l.3336 LVM_GETITEMSPACING=(+51) ⇒ el +50 del código es
  CORRECTO y la H1 del árbitro 21 (+48) queda REFUTADA (habría roto los botones). Coincide
  con el SDK real.
- Contraste mecánico de TODAS las constantes LVM/LVN/LVIM/LVIR/LVS_EX/LVIF/LVIS/LVCF/
  LVCFMT/LVNI del código contra esa cabecera: todas correctas (con nº de línea). Única
  discrepancia: LVIF_STATE=0x2 (canónico 0x8, wine l.3153) — preexistente desde 1.0.1,
  solo usado en LVM_SETITEMSTATE que IGNORA Mask (macro ListView_SetItemState l.3980-82 no
  lo inicializa) ⇒ impacto cero; no bloqueante. WM_MOUSEMOVE/WM_LBUTTONUP/
  WM_CAPTURECHANGED estándar de winuser.h, correctos.
- H2 CONFIRMADA (l.3284 GETITEMRECT=+14; l.3285 SETITEMPOSITION=+15) y aplicada; H3
  CONFIRMADA en diagnóstico y aplicada con la struct REAL de wine (l.3837-43: cbSize,
  dwFlags, iItem, dwReserved = 16 B — la «canónica» de 12 B/3 campos del árbitro 21 también
  refutada; sonda de aserciones en compilación x64: 16 B, offsets 0/4/8/12; RECT=16;
  LVHITTESTINFO=24 Flags@8 IItem@12; LVITEMW=72; LVCOLUMNW=40); H4 aplicada (7 guards
  verificados por grep; todos los caminos WM_COMMAND/accel/menú desembocan en funciones
  guardadas); H5 aplicada (LVM_GETITEMCOUNT eliminada).
- Delta 1.0.3 = lo declarado 1:1 (diff + mtime: win32/arrastrar/dialogos/tarea/controles/
  D-17/D-19/versioninfo/defaults/nsi/manifest/README; app.go/es.go sin cambios en 1.0.3);
  motor 0 líneas de diff.
- Ejecuciones propias: tests motor 27 RUN/27 PASS/0 FAIL/0 SKIP (ok 1.966 s); go vet
  GOOS=windows exactamente 2 avisos (app.go:220:32 y 227:55, el falso positivo lParam
  WM_NOTIFY); rebuild exe con las flags exactas de build.sh → /tmp/arb1303.exe md5
  690b75a96b839c84c3b6da572848639a = dist/ = declarado (cmp BYTE-IDÉNTICO, PE32+ x64 GUI,
  9 secciones, 2.636.288 B); instalador reproducido en /tmp (cp -p, makensis v3.11-1,
  licencia=LICENSE) → md5 a90f7ecf4885221c8faa4e98f8fb03f2 = installer/ = download/ =
  declarado (BYTE-IDÉNTICO, 1.077.006 B); «1.0.3.0» UTF-16 ×2 en exe e instalador (y ×2 en
  .syso), 0 restos de 1.0.2.0/1.0.1.0; installer/ y download/ solo contienen el 1.0.3;
  cadena temporal coherente.
- Inflado del autor: NINGUNO. Notas: worklog sin sección «Task ID: 22»; soltarArchivos
  (WM_DROPFILES) sin guard «arrastrando» (hueco teóricamente inalcanzable); LVIF_STATE
  0x2→0x8 recomendado por higiene en la próxima release.
- NO VERIFICADO (sin Windows aquí): ejecución runtime de la GUI; la repro para el usuario
  está en §5 del informe.
- Informe completo: audio-merger-native/INFORME_ARBITRO_FIX_1_0_3.md.

Stage Summary:
- VEREDICTO: BUGFIX 1.0.3 APROBADO ✅. H1 refutada con cabecera real (wine, descarga y grep
  propios); H2/H3/H4/H5 confirmadas y correctamente aplicadas (LVINSERTMARK canónica real de
  16 B); logística reproducible byte a byte (exe e instalador), motor intacto 27/27, vet
  exacto, cadena de versión completa y sin restos. Hallazgos propios no bloqueantes:
  LVIF_STATE=0x2 (impacto cero) y guard teórico en soltarArchivos. Pendiente: verificación
  runtime del usuario (repro §5 del informe).


## Task ID: 24 — Fix de render web: SSR siempre visible (D-24)

Síntoma del usuario («¿pero qué mierda es esto?»): página casi vacía en su navegador
Windows — solo cabecera y cinta de formatos; hero, consola y secciones invisibles.

- Diagnóstico mecánico: el SSR emitía 13 bloques con `style="opacity:0"` en línea
  (initial de framer-motion). El contenido solo volvía si el bundle cliente ejecutaba
  por completo; en el navegador del usuario no llegaba (chunks lentos/antiguos/
  bloqueados) → invisible permanente. Coincide 1:1 con su captura (lo que se veía
  era justo lo NO envuelto en Reveal).
- Fix (mejora progresiva, D-24): `Reveal` reescrito como componente de SERVIDOR puro
  (sin framer-motion) que emite `<div class="reveal">` 100% visible; la animación
  pasa a CSS + micro-script inline de arranque (primer hijo del body, antes del
  primer pintado): clase `reveal-on` en <html> SOLO si JS vive y sin
  prefers-reduced-motion + IntersectionObserver que añade `.reveal-in`. Sin JS / JS
  roto / reduce: nada se oculta, todo se lee. Endurecimientos: `:focus-within`
  (teclado nunca tabula sobre lo invisible), bloque reduce que fuerza opacity 1,
  `suppressHydrationWarning` (silencia diff de className cuando el IO gana a la
  hidratación — hallazgo 1 del árbitro, corregido y re-verificado).
- Se elimina `<Toaster />` del layout (nadie usa toasts aquí) → la página queda sin
  componentes cliente propios: único JS con peso = UMD del widget (independiente de
  React). Fallback light-DOM dentro de `<audio-merger>` para navegadores que no
  logran ejecutar el UMD (antes: hueco vacío; ahora: tarjeta que explica qué
  necesita). `allowedDevOrigins: ["*.space-z.ai"]` (aviso del proxy de preview
  silenciado). Favicon local `/logo.svg`. Polish del árbitro visual:
  `[text-wrap:pretty]` en subtítulos/párrafos y línea de privacidad en el footer.
- Verificación propia (agent-browser): SSR 0×opacity:0; con los 13 chunks de React
  abortados la página queda completa, animada y el widget funcional (UMD vive fuera
  de /_next); sin JS total 13/13 estáticos; reduced-motion sin transform; foco→
  revelado instantáneo; ruta dorada completa (ejemplos → «Bajar» reordena →
  «Unir audios» → «Unión completada · Descargar audio-unido-….mp3»); móvil 390×844
  sin overflow y footer a 844 exacto; lint limpio; consola sin avisos; dev.log limpio.
- NOTA operativa: el sandbox mata procesos entre comandos; el dev server se relanza
  con doble bifurcación huérfana: `( ( exec setsid bun run dev > /dev/null 2>&1 <
  /dev/null ) & )` desde /home/z/my-project (un simple `&` muere).
- NO VERIFICADO: reproducción en el navegador real del usuario (pendiente de su
  recarga con Ctrl+F5 y confirmación).

## Task ID: 25 — Árbitro adversarial del fix de render: VEREDICTO APROBADO CON RESERVAS ✅

Informe: audio-merger/INFORME_ARBITRO_FIX_RENDER.md. Cero mutaciones al repo.

- 9 vías de ataque ejecutadas con evidencia: (A) SSR crudo — 0×opacity:0, script de
  arranque antes del <header>, 13 .reveal, reglas CSS servidas; (B) 13 chunks de
  React abortados — página completa + animada + widget UMD cargado y upgradeado;
  (C) sin reveal-on → 13/13 opacity 1; (D) reducedMotion real vía Playwright — sin
  clase, sin transform, escenarios híbrido también 100% visible; (E) focus-within en
  CSS servido + foco real en bloque oculto → visible instantáneo; (F) ruta dorada
  del widget con reorden y fusión completada en shadowRoot; (G) lint exit 0, móvil
  footerBottom==844==innerHeight, sin overflow, desktop footer natural; (H) md5
  widget público==dist, mtime del paquete anterior al fix, contratos SSR intactos,
  samples 200, favicon CDN→local y Toaster eliminado verificados por git diff, sin
  chunks de framer-motion/sonner solicitados; (I) auditoría visual con z-ai vision —
  h1 completo, footer natural, sin cortes ni solapamientos.
- Hallazgo 1 (MENOR, dev-only): aviso de hidratación React 19 (IO añade .reveal-in
  antes de hidratar) — funcionalmente benigno (sonda temporal: clase sobrevive,
  opacity completa a 1, React no revierte); REMEDIADO por el autor con
  `suppressHydrationWarning` y re-verificado (consola limpia tras recarga).
- Hallazgo 2 (herramienta, no del fix): `agent-browser set media reduced` es no-op;
  resuelto con Playwright real. Hallazgo 3: allowedDevOrigins NO VERIFICABLE desde
  el sandbox (proxy de preview no reproducible); config válida y servidor corre.
- Reserva cerrada: el aviso de hidratación ya no aparece (console limpio tras
  recarga limpia). Pendiente: recarga del usuario (Ctrl+F5) como verificación final.
