# D-02 — ffmpeg.wasm diferido con worker propio

- **Problema:** unir audios de formatos dispares (MP3/WAV/OGG/M4A/FLAC) con garantías
  necesita un demuxor/encoder real; además el caso “podcast largo” exige `-c copy` y
  montaje de archivos sin cargarlos en RAM. Y el motor debe cargar SOLO cuando se usa
  (nunca en arranque) para no penalizar la página anfitriona.
- **Decisión:** usar el core oficial `@ffmpeg/core` (WASM, versión anclada 0.12.10)
  cargado en diferido, pero conduciolo con **nuestro propio worker** que habla el
  protocolo de mensajes de ffmpeg.wasm (LOAD/EXEC/MOUNT/UNMOUNT/READ/WRITE + eventos
  LOG/PROGRESS). El worker se crea desde una URL blob generada en runtime a partir de
  una cadena embebida en el bundle; el core se `importScripts` desde una URL blob
  (descargada con progreso) o directa si es same-origin.
- **Coste:** ~160 líneas de worker/protocolo que mantenemos nosotros (el protocolo es
  plano y estable); responsabilidad de gestionar ciclo de vida (terminate/recarga).
- **Alternativa descartada (1):** empaquetar `@ffmpeg/ffmpeg` con el bundler. Su worker
  interno se resuelve con `new URL('./worker.js', import.meta.url)` y se rompe o cambia
  de comportamiento según bundler/formato (ESM vs UMD); exigiría `classWorkerURL`
  externo en UMD. **Alternativa descartada (2):** Web Audio API + lame.js — decodificar
  a PCM en el hilo principal y codificar MP3 a mano: coste de memoria O(duración) sin
  streaming real, sin M4A/FLAC/OGG de entrada fiables, sin `-c copy` (rehash total para
  podcasts largos) y varios encoders JS que mantener.

# Detalle de carga

- `single-thread` por defecto (sin COOP/COEP). `multi-thread` solo si
  `crossOriginIsolated` y el anfitrión sirve el core MT (atributo `engine-mode`).
- Descarga del core con progreso visible (`fetch` en streaming) → URL blob →
  `importScripts` en worker clásico. Cero dependencias de runtime: ni `@ffmpeg/ffmpeg`
  ni `@ffmpeg/util` se empaquetan (implementamos `toBlobURL` en ~10 líneas).

# Requisitos de CSP del anfitrión (limitación declarada)

El worker nace de una URL blob (no existe alternativa portable: ni `data:` ni cross-origin
funcionan para `new Worker`) y el core se descarga por `fetch`. Por tanto la página
anfitriona debe permitir `worker-src blob:` y, si se usa la CDN por defecto, acceso de
red hacia ella (o autohospedar el core con `engine-base`). Una CSP `script-src 'self'`
sin `blob:` rompe el motor: se detecta el fallo de creación del worker / descarga y se
reporta como `WASM_LOAD_FAILED` con causa y consejo accionable (autohospedaje o relajar
CSP). Documentado en README § “CSP del anfitrión”. La promesa de “cualquier web” queda
acotada: cualquier web sin CSP restrictiva o con los permisos documentados.

# Ciclo de vida de las object URLs (declarado)

- URL blob del worker: persiste mientras viva el motor (es reutilizable; ~KB).
- URL blob del pegamento/core JS y del WASM: se revocan tras completar la carga.
- URL del resultado (`Blob` de salida): se revoca al iniciar una nueva unión, en
  `reset()` y al desconectar el componente (`disconnectedCallback`).
- Compilación del WASM de ~32 MB: coste apreciable en móvil (varios segundos);
  se informa con estado de carga; no mitigable desde la librería.
