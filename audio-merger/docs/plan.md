# FASE 1 — Plan Estratégico · `@zai/audio-merger` v1

> Biblioteca cliente pura que une varios archivos de audio en uno solo, dentro del navegador,
> embebible en una web con una etiqueta `<script>` y una etiqueta `<audio-merger>`.

## 1. Objetivo

Un usuario sube varios audios (MP3, WAV, OGG, M4A, FLAC), los reordena libremente
(arrastre o botones ↑/↓ accesibles por teclado), los une y descarga el resultado
(MP3 128/192/320 kbps o WAV). Todo el procesado ocurre en su navegador: ningún byte
sale del dispositivo. Un desarrollador puede embeberlo sin configuración adicional
en páginas sin CSP restrictiva (requisitos de CSP del anfitrión: §5 y README).

## 2. Alcance — y qué NO hace la v1

**Hace:** carga múltiple con arrastre de archivos, reordenación (DnD + teclado),
validación de formato/tamaño, sonda de parámetros de audio, unión con estrategia
`-c copy` (códecs compatibles) o re-codificación (mixto), salidas MP3/WAV,
fundido opcional entre pistas (post-proceso registrado), estimación previa con
advertencias, progreso, cancelación, descarga y preescucha.

**NO hace (declarado explícitamente):**
- Mezcla/superposición paralela de pistas y recorte interactivo (trim): requieren
  edición de línea de tiempo; se declaran como comportamiento futuro (Regla del Carro:
  un post-proceso nuevo puede exigir código nuevo, pero no tocar el núcleo).
- Persistencia de la lista (sin IndexedDB): al cerrar la pestaña el trabajo se pierde.
  Decisión consciente: v1 sin estado persistente, sin migraciones (ver FASE 2).
- Subida a servidor, procesado en remoto, cuentas, metadatos ID3 editables, vídeo.
- Normalización de sonoridad (ejemplo documentado de extensión futura).

## 3. Actores y casos de uso

| Actor | Caso principal | Requisito clave |
|---|---|---|
| Usuario final sin perfil técnico | Unir 3–50 audios en < 60 s sin leer nada | Flujo lineal visible, textos claros, cero jerga. Verificación del tiempo: cronometraje real de la ruta dorada en la demo con los fixtures incluidos (§12) |
| Usuario con grabaciones largas | Episodios de podcast: horas de audio, archivos grandes | `-c copy`, WORKERFS (no cargar GB en RAM), advertencias por estimación antes de empezar |
| Desarrollador que embebe | Añadir la herramienta a una web ajena | `<script>` + `<audio-merger>`, API pública estable, eventos, atributos; límites de CSP documentados (§5) |

## 4. Supuestos (declarados, con vía de verificación o marcados como supuesto)

- **Navegadores:** Chrome/Edge ≥ 111, Firefox ≥ 111, Safari ≥ 16.4. Requisitos técnicos
  usados: Custom Elements v1, Shadow DOM + `adoptedStyleSheets`, `crypto.randomUUID`
  (con fallback determinista), File API + `File.arrayBuffer()`, Worker clásico con
  `importScripts`, WORKERFS en el worker, `AbortController`.
- **Motor single-thread por defecto:** el core WASM ST no exige COOP/COEP. Multi-thread
  solo si la página está `crossOriginIsolated` y el host sirve el core MT (opcional, documentado).
- **Memoria (SUPUESTO DECLARADO, no medido por nosotros):** techo práctico de pestaña
  del orden de ~2 GB en escritorio (menor en móvil, ~1 GB); límite de asignación contigua
  de `ArrayBuffer` de 1–2 GB según motor. Vía de verificación del comportamiento real en
  nuestro caso: prueba de humo E2E con salidas de tamaño creciente (§12); el límite exacto
  por navegador/motor queda fuera de lo verificable aquí y se declara como supuesto.
- **Tamaños máximos (configurables, no hardcodeados):** por archivo de entrada 2 GB por
  defecto (las entradas se transmiten por WORKERFS, no por RAM); la SALIDA es el recurso
  acotado: pico en el worker ≈ 2×S (archivo en MEMFS + copia al leer; transferencia al
  hilo principal sin copia vía `postMessage` con transfer de buffer, `unlink` tras leer y
  `terminate` del motor tras salidas gigantes para liberar el heap WASM). Límite práctico
  de salida ~1 GB en escritorio y ~400–500 MB en móvil (techo de pestaña menor), con
  diálogo de advertencia por estimación desde 350 MB por defecto (`warnOutputBytes`,
  configurable en `config/defaults.ts`).
- **Fixtures:** generadas con ffmpeg CLI 7.1.5 del entorno con script reproducible
  (`tests/fixtures/generate.sh`); los binarios resultantes se versionan en el repo.
  Reproducibilidad DECLARADA con precisión: el contenido PCM es determinista (senoides y
  ruido con semilla fija), pero los contenedores OGG/Opus insertan un número de serie de
  página aleatorio → los hashes de `ruido.oga` y `tono-550.opus` cambian entre
  regeneraciones (verificado por comparación real). La verificación correcta de estos
  fixtures es por contenido/duración (ffprobe), no por hash de archivo.
- **Red:** el core (≈ 32 MB: 112.059 B de pegamento JS + 32.232.419 B de WASM) se
  descarga la primera vez desde CDN (jsdelivr, versión anclada) o desde `engine-base`
  autohospedado; atributo para cambiarlo. La compilación de un WASM de 32 MB tiene coste
  apreciable en móviles (documentado; no mitigable desde la librería).

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación v1 |
|---|---|
| OOM al unir horas de audio | WORKERFS para entradas; solo la salida vive en MEMFS; cadena de memoria declarada (pico ≈ 2×S, §4); estimación previa de tamaño/duración con diálogo de confirmación (umbral configurable); `unlink` de la salida tras leerla y `terminate` del motor tras salidas grandes (config); clasificación heurística de OOM por patrón de log del core |
| COOP/COEP ausentes (la mayoría de webs) | Motor single-thread por defecto; MT es optativo y detectado (`crossOriginIsolated`), nunca requerido |
| Safari + SharedArrayBuffer | Igual que arriba: ST funciona sin SAB |
| **CSP del anfitrión bloquea worker/blob/CDN** | Requisito documentado en README (§ “CSP del anfitrión”): `worker-src blob:` (el worker nace de URL blob, inexorable), y si se usa CDN por defecto `connect-src`/`script-src` hacia ella o autohospedaje con `engine-base`. Fallo de creación del worker o de descarga del core → error tipado `WASM_LOAD_FAILED` con causa y consejo accionable (nunca silencioso). La promesa de “cualquier web” se acota a “sin CSP restrictiva o con los permisos documentados” |
| Unión silenciosa incorrecta (códecs “casi” compatibles) | Sonda de parámetros (códec, tasa, canales) de TODAS las pistas en una sola ejecución; regla estricta y configurable para `-c copy` (D-04, incluye casos VBR/CBR y AAC); si no se cumple → re-codificación con `-map_metadata -1` (sin metadata heredada del primer input ni ID3 intercalado); **chequeo post-unión: duración de la salida ≈ Σ duraciones de entrada con tolerancia configurable** — si no cuadra, el resultado se marca con advertencia visible en la UI (no se oculta) |
| Bundle inicial grande | El motor NO se empaqueta ni se carga en arranque: solo UI+núcleo (≤ 30 KB gzip, presupuesto medible); el core se descarga al primer `merge()` o `preloadEngine()` explícito |
| Cierre de pestaña durante el merge | Sin efectos secundarios: no hay servidor ni persistencia; el trabajo se pierde y se documenta |
| Fallo de red al cargar el core | Error tipado `WASM_LOAD_FAILED` (con distinción de causa: red/CSP/no encontrado) y reintento explícito; nunca valores por defecto silenciosos |
| Archivo corrupto / no soportado | Sonda + clasificación por patrones de log (`CORRUPT_FILE` vs `UNSUPPORTED_FORMAT`); la pista se marca y se excluye de la unión con mensaje accionable |
| Duración no conocible a priori (FLAC sin SEEKTABLE, OGG de flujo) | La estimación degrada de forma declarada: duración “desconocida” en UI; cota superior por suma de tamaños de entrada (vía copy) y aviso genérico; nunca se inventa una cifra |
| Fuga de object URLs | Ciclo de vida declarado: la URL del worker persiste (reutilizable); las URL blob del core se revocan tras la carga; la URL del resultado se revoca en nueva unión/reset/desconexión del componente |
| Metadata heredada errónea / ID3 intercalado | Re-encode: `-map_metadata -1`. Copy: la validación de duración post-unión detecta desincronizaciones groseras y avisa |
| Autoplay bloqueado por el navegador | La preescucha `<audio controls>` solo reproduce por gesto directo del usuario; la librería nunca llama a `play()` automáticamente, no hay promesa que rechazar |
| Cabeceras ID3v2 gigantes (portadas embebidas) en entradas | La sonda solo abre cabeceras de demuxer (coste acotado, sin decodificar audio); las cabeceras grandes no afectan a WORKERFS que transmite el archivo tal cual |

## 6. Arquitectura (cliente puro)

**Por qué cliente puro:** el requisito es embeber en cualquier web con dos etiquetas y sin
infraestructura; sin backend no hay coste de servidores, ni privacidad de audio en riesgo,
ni CORS de subida. **Coste declarado:** techo de memoria del navegador (~2 GB/pestaña,
supuesto §4) y velocidad de CPU local; **alternativa descartada:** servicio con ffmpeg
nativo (rápido y sin techo de RAM, pero exige infraestructura, subida de datos y
configuración — justo lo vetado).

Capas (dependencia en una sola dirección):

```
config/ (defaults + registro + validación)      ← parámetros y formatos, cero lógica de negocio
   ↓
core/ (puro, testeable sin navegador)           ← tipos, errores, reducer, orden, validación,
   ↓                                              estimación, orquestación mergeTracks(signal)
engine/ (efectos: worker + WASM)                ← loader diferido, sonda, estrategias ffmpeg,
   ↓                                              registro de post-procesos
ui/ (Web Component <audio-merger>)              ← Shadow DOM, reducer binding, DnD, a11y
```

- **`core`** no importa `engine` ni `ui`; el motor se inyecta en `mergeTracks`
  (contrato con `AbortSignal` + `onProgress`) → el núcleo se testea con motor simulado.
- **`engine`** encapsula un worker propio con el protocolo de mensajes de ffmpeg.wasm
  (ver D-02/D-13): el bundle no depende de cómo cada bundler resuelve workers.

**Cola y concurrencia (declarada):** el motor serializa internamente sus operaciones
(carga → sonda → unión) con una cadena de promesas; el componente admite **un único job
activo**: un `merge()` mientras otro está en curso se rechaza con el error tipado
`JOB_IN_PROGRESS` (mensaje accionable, sin colas ocultas ni reemplazo silencioso). La
cancelación (`cancel()` / `AbortSignal`) hace `terminate()` del worker y el siguiente
uso recarga el motor (D-14).

## 7. Estructura de UI (Átomos → Moléculas → Organismos → Página)

- **Átomos:** botón (primario/ghost/peligro), chip de estado, icono SVG inline,
  barra de progreso, campo select, texto de metadatos (duración/tamaño).
- **Moléculas:** fila de pista (handle + nombre + metadatos + chip + botones ↑/↓/✕),
  selector de salida (formato + bitrate), zona de arrastre, barra de estado con `aria-live`.
- **Organismos:** lista de pistas (con virtualización condicional), barra de
  herramientas, panel de resultado (descarga + preescucha `<audio>`), panel de error,
  diálogo de advertencia por estimación.
- **Página:** el propio `<audio-merger>` (todo en Shadow DOM) y la demo del host
  Next.js que lo embebe literalmente con `<script>` + etiqueta.

## 8. Gestión de estado

Reducer puro dentro del componente (estado inmutable + acciones tipadas), sin librería
externa. **Problema que resuelve:** estado predecible y testeable sin dependencias.
**Coste:** diff/re-render manual selectivo por regiones (lista vs toolbar vs estado).
**Alternativa descartada:** Lit (estado reactivo ligero, pero añade dependencia de
runtime y su virtualizador pesa más que el nuestro) y Redux/Zustand (sobredimensionado
para un componente aislado). Ver D-03.

## 9. Índice de decisiones (docs/decisions/)

Escritas: D-01…D-06 y D-13. **Previstas** (se redactan al llegar su fase, todas con
problema/coste/alternativa): D-07 i18n, D-08 validador, D-09 sonda multi-entrada,
D-10 duración, D-11 nombres sanitizados, D-12 fixtures/pruebas, D-14 cancelación.

| ID | Decisión |
|---|---|
| D-01 | Cliente puro sin backend |
| D-02 | ffmpeg.wasm diferido + worker propio con protocolo de mensajes |
| D-03 | Web Component + Shadow DOM + reducer propio (sin framework) |
| D-04 | Estrategias de unión (copy / re-encode) seleccionadas por datos de sonda + registro |
| D-05 | WORKERFS para entradas gigantes (salida en MEMFS, cadena de memoria declarada) |
| D-06 | Virtualización propia por ventanas con umbral configurable |
| D-07 | i18n por módulos de mensajes (es por defecto) |
| D-08 | Validador declarativo propio de opciones/config (sin ajv) |
| D-09 | Sonda multi-entrada en una sola ejecución ffmpeg |
| D-10 | Duración vía `<audio>` + sonda (sin decodificar todo el archivo) |
| D-11 | Nombres internos sanitizados `p<N>.<ext>` (anti-inyección y charset) |
| D-12 | Fixtures reales reproducibles + pruebas del motor en navegador real |
| D-13 | Build dual ESM/UMD con motor externo no empaquetado |
| D-14 | Cancelación con `terminate()` + recarga perezosa del motor |

## 10. Presupuesto de bundle (≤ 30 KB gzip sin WASM)

| Pieza | Estimado gzip | Nota |
|---|---|---|
| Web Component + UI + estilos | ~10–12 KB | Shadow DOM + hoja adoptada, sin framework |
| core (reducer, validación, errores, estimación) | ~4–5 KB | puro, sin DOM |
| config + registro + i18n/es | ~3–4 KB | textos centralizados |
| engine loader + worker source + estrategias | ~4–6 KB | NO incluye el core WASM ni el pegamento de @ffmpeg |
| **Objetivo interno** | **≤ 27 KB** | Margen del 10% sobre el listón de 30 KB |

Medición real en FASE 6 sobre las DOS salidas (`gzip -c dist/audio-merger.umd.js | wc -c`
y `gzip -c dist/audio-merger.es.js | wc -c`); si se supera, se recorta antes de dar por
terminada la fase. El core WASM (32.232.419 B) y su pegamento JS (112.059 B) se
descargan **solo** con el primer `merge()` o llamada explícita `preloadEngine()`. Nunca
en el arranque: verificable inspeccionando el HTML inicial y los recursos de red del
primer render.

## 11. Matriz de navegadores

| Navegador | Mínimo | Motor | Notas |
|---|---|---|---|
| Chrome / Edge | 111 | ST (MT si COOP/COEP) | Matriz principal de verificación |
| Firefox | 111 | ST (MT si COOP/COEP) | — |
| Safari | 16.4 | ST | FLAC/M4A decodificados por el core WASM, no por el navegador |
| Navegadores sin WASM/Worker | — | — | Error tipado `BROWSER_UNSUPPORTED` con mensaje accionable, sin degradación silenciosa |

## 12. Plan de verificación (honestidad epistémica)

- **Núcleo:** pruebas unitarias reales con Vitest en Node (reducer, validación,
  estrategias, estimación, errores, registro/extensión, cola `JOB_IN_PROGRESS`) —
  salida real pegada en el informe.
- **Motor con fixtures reales:** batería en navegador real (página `selftest` servida
  por la demo) ejecutada con automatización de navegador: MP3+MP3 (copy), WAV+MP3
  (re-encode), M4A+MP3, FLAC+MP3, OGG, OPUS registrado como extensión, archivo
  corrupto → códigos de error esperados, y validación de duración de salida ≈ Σ entradas.
- **Ruta dorada:** subir 3 audios reales → reordenar → unir → descargar, cronometrada
  en el navegador real (fixtures locales para aislar el tiempo de red del core).
- **Presupuesto de bundle:** medición `gzip` de ambas salidas.
- **Prueba de humo de memoria:** unión de fixtures concatenada N veces para crecer la
  salida y observar el comportamiento (no es una medición del techo del navegador;
  el techo exacto queda como supuesto declarado §4).
- Lo que no se pueda verificar se declara como **no verificado** con el procedimiento
  exacto para reproducirlo (p. ej. MT con COOP/COEP no se activa en la demo por defecto).
