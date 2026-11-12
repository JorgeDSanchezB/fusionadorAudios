# INFORME DEL ÁRBITRO FINAL ADVERSARIAL — `@zai/audio-merger`

> **NOTA DE LECTURA:** este documento contiene las DOS rondas del árbitro final.
> La Ronda 1 (abajo) RECHAZÓ el entregable por 1 defecto bloqueante (filas fantasma).
> Tras su corrección, la Ronda 2 (sección final «VEREDICTO FINAL (Ronda 2)») lo
> **APROBÓ**. El veredicto vigente es el de la Ronda 2: **ENTREGABLE: APROBADO ✅**.

**Fecha:** 2026-10-27 07:20 UTC
**Árbitro:** subagente independiente adversarial (Task ID 14). No construí el proyecto.
**Alcance:** LISTÓN (7 puntos) + comprobaciones por defecto A–G, con EJECUCIÓN propia de todo lo
ejecutable (agent-browser/Chromium real, bun, gzip, greps, ffprobe). Nada del proyecto fue
modificado por el árbitro (excepto este informe y el apéndice al worklog).

---

## VEREDICTO — RONDA 1 (superado por la Ronda 2)

# ENTREGABLE: RECHAZADO (vuelve a FASE 5)

**Motivo:** 1 defecto BLOQUEANTE nuevo, descubierto y demostrado por ejecución propia en
Chromium real con el artefacto servido (`public/audio-merger/audio-merger.umd.js`, idéntico
bit a bit a `dist/`): **la reconciliación de filas está rota para las ELIMINACIONES** —
`removeTrack()` y `clear()` dejan las filas (nodos `li[data-id]`) permanentemente en el DOM
como filas fantasma, con numeración duplicada, botones ✕ habilitados pero inertes y el
mensaje «Aún no hay pistas» conviviendo con filas visibles. Contradice el contrato declarado
de `docs/rendering.md` («borrado para ids fuera del orden») y es la misma clase y el mismo
flujo primario («Vaciar lista») que el árbitro de FASE 5 ya clasificó como bloqueante
(defecto N1 de su 2ª pasada, menos visible que este). La suite jsdom no lo detecta porque
sus tests de `removeTrack`/`clear` solo comprueban estado, nunca el DOM.

**Los 7 puntos del LISTÓN, por separado, están en verde** (verificados por ejecución propia).
El rechazo se decide por las comprobaciones por defecto del árbitro (C/D y el estándar
propio del proyecto: «afirmación falsa sobre el código real» y «corrupción visible del UI en
flujo primario»). El fix es de ~2 líneas + 2 tests: corregido eso (y opcionalmente los
no bloqueantes), una sola re-auditoría de FASE 5 debería bastar; el resto del listón queda
verificado en verde por este informe y no necesita re-ejecutarse.

---

## PUNTOS 1–7 DEL LISTÓN

### Punto 1 — Ruta dorada < 60 s en demo reproducible: ✅ (medido: 19,1 s)

Ejecutado por mí con agent-browser sobre `http://localhost:3000/`:

- `t0 = 2026-10-27T07:00:59.746Z` fijado con `performance.now()` justo antes de pulsar
  **«Cargar 3 audios de ejemplo»**.
- Filas cargadas: `tono-440-est.mp3`, `voz-sim.wav`, `tono-660.m4a` (botón deshabilitado
  → «Ejemplos cargados ✓»).
- Reorden: clic en **«Bajar tono-440-est.mp3»** → orden verificado por API:
  `["voz-sim.wav","tono-440-est.mp3","tono-660.m4a"]` (la pista 1 pasó a posición 2). ✅
- Clic en **«Unir audios»** → sondeo de `document.querySelector('audio-merger').state`:
  `running → running → completed` (poll 3).
- **Tiempo total medido desde t0: `performance.now() - t0 = 19105.8 ms` ≈ 19,1 s** (incluye
  la carga de los 3 samples por HTTP, mis dos snapshots intermedios y la unión con carga
  fría del motor WASM). **≤ 60 s** ✅.
- Resultado (`el.result`): `{name: "audio-unido-20261027-0701.mp3", durationMs: 7050,
  blob.size: 169944, warnings: [], mimeType: "audio/mpeg"}`; `el.state === "completed"`.
- Botón **«Descargar · audio-unido-20261027-0701.mp3»** presente (snapshot, ref e40) y
  preescucha `<audio>` + botón play presentes. ✅
- **Subida REAL de archivos** (no solo el botón de ejemplos): `agent-browser upload` sobre
  el `input[type=file]` del Shadow DOM con 2 fixtures reales
  (`tono-440-est.mp3`, `tono-220.flac`) → 2 pistas `ready` con duraciones reales
  (3000 ms c/u, 48.944 B y 45.136 B) → `merge()` → `completed` en 1,2 s (motor caliente):
  `{size: 145493, durationMs: 6030, strategy: "reencode", warnings: []}`. ✅
- **Descarga end-to-end**: interceptor de clic → `el.download()` dispara un
  `<a download="audio-unido-20261027-0708.mp3" href="blob:http://localhost:3000/…">`. ✅

### Punto 2 — Embed con 1 `<script>` + 1 `<audio-merger>`: ✅

- `src/app/page.tsx:97–104`: exactamente
  `<script src="/audio-merger/audio-merger.umd.js" defer />` y
  `<audio-merger engine-base="/ffmpeg" locale="es" format="mp3" bitrate="192" />`. El
  bloque se autodeclara «embed real» (líneas 90–93). El botón de ejemplos y su script
  inline son ayuda de la DEMO y están declarados como ajenos a la librería
  (page.tsx:107–121, «Botón propio de esta demo (no de la librería)»).
- `public/audio-merger/audio-merger.umd.js` existe: **95.915 B** (`cmp` contra
  `dist/audio-merger.umd.js`: idénticos). El elemento se auto-registra al importar el UMD
  (verificado E2E: la página lo renderiza sin ningún paso manual).
- README documenta: embed mínimo con CDN por defecto (2 etiquetas, líneas 16–21),
  autohospedaje con `engine-base` + layout D-13 (27–38), CSP del anfitrión (167–173),
  MT/no-verificado honesto (151–165). **Sin pasos ocultos imprescindibles**: sin
  `engine-base` funciona contra la CDN anclada; el autohospedaje es opcional y documentado.

### Punto 3 — Tests del core con ≥5 fixtures + batería de navegador: ✅

- `cd audio-merger && bun run test` → **exit=0, Test Files 14 passed (14), Tests 191
  passed (191)**, sin «Errors» ni unhandled rejections. `bun run typecheck` → exit 0.
- `tests/fixtures/`: **8 archivos, 7 formatos válidos + 1 corrupto** — MP3 estéreo 128k
  (48.944 B), MP3 mono 22050/64k (16.761 B), WAV PCM (352.878 B), M4A AAC (25.382 B),
  OGG vorbis (25.467 B), FLAC (45.136 B), OPUS (33.519 B), `roto.mp3` (4.099 B). Validados
  por mí con `ffprobe` (códecs/tasas/canales/duraciones correctas; `roto.mp3` falla con
  «Failed to find two consecutive MPEG audio frames»). ≥5 formatos ✅.
- **Batería de navegador** (`http://localhost:3000/selftest.html`, ejecutada por mí en DOS
  sesiones de Chromium, una de ellas con navegador recién lanzado): **12/12 PASS**,
  `window.__selftest.terminado === true`. Detalle literal de la 2ª ejecución:
  - WASM no se carga en el arranque ✅
  - MP3+MP3→MP3 (copy): duración 6030 ms, 95,1 KB, contenedor válido ✅
  - MP3 mono 22050 + MP3 estéreo → reencode: 5000 ms, 118,8 KB ✅
  - WAV+MP3→MP3 320: 5000 ms, 198,0 KB ✅
  - M4A(AAC)+MP3→MP3: 5020 ms, 119,4 KB ✅
  - FLAC+MP3→WAV (PCM): 6000 ms, 1033,7 KB, contenedor WAV válido ✅
  - OGG(vorbis)+MP3→MP3: 5000 ms, 79,2 KB ✅
  - **EXTENSIÓN: OPUS registrado por API + OPUS+MP3**: 5000 ms, 118,8 KB ✅
  - **FUNDIDO 200 ms** (post-proceso registrado): 6000 ms, 142,1 KB ✅
  - **CORRUPTO: roto.mp3 → `CORRUPT_FILE`** («roto.mp3: no se pudo abrir (datos
    inválidos)») ✅
  - **Cancelación AbortSignal → `USER_CANCELLED`** ✅
  - **Componente completo** addFiles→merge→resultado: estado `completed` ✅
- **Validación INDEPENDIENTE de la salida** (fuera del navegador): extraje el blob de una
  unión real (2× tono-440-est.mp3, copy) a `/tmp/union-arbitro.mp3` (97.428 B) y:
  `ffprobe` → `mp3, 44100 Hz, 2 canales, duration 6.060408, bit_rate 128609`;
  `ffmpeg -v error -f null -` → **exit 0 (decodifica sin errores)**. El archivo producido
  es un MP3 real y válido. ✅

### Punto 4 — Sin rellenos ni texto de ejemplo: ✅

Greps reales (mayúsculas/minúsculas) sobre `src/ docs/ demo/ README.md` (y además
`tests/ scripts/ *.json *.ts`) de `TODO|FIXME|XXX|Lorem|ipsum|example\.com|placeholder`:
**todas las coincidencias son el castellano «todo/TODOS»** (p. ej. defaults.ts:2 «TODO
límite, umbral…», atributos.ts:138 «TODO el conjunto», extension.md:33 «Eso es TODO»).
**Cero marcadores reales.** `FIXME|XXX|Lorem|ipsum|example.com|placeholder` → 0
coincidencias en todo el paquete.

### Punto 5 — Decisiones D-01..D-14 con problema/coste/alternativa: ✅

Leídos los **14 archivos** uno a uno. Cada uno declara **Problema**, **Decisión**, **Coste**
y **Alternativa(s) descartada(s)** con razones técnicas concretas (D-02 y D-03 con 2–3
alternativas; D-14 con la alternativa dentro del párrafo de coste, presente). D-03 incluye
sección explícita «Anti-sobreingeniería». El comando reproducible de D-05
(`grep -ao WORKERFS node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js | wc -l`) lo ejecuté:
**21** ✅.

### Punto 6 — Bundle inicial sin WASM ≤ 30 KB gzip: ✅

```
gzip -c dist/audio-merger.umd.js | wc -c   → 28.522 B  (= 27,85 KB)  ≤ 30 KB ✅
gzip -c dist/audio-merger.es.js  | wc -c   → 32.239 B  (ESM, documentado aparte en README;
                                             no es el bundle del embed)
```
El bundle que carga la página en el primer render es el UMD (verificado en el punto 7):
el único script del widget cargado es `/audio-merger/audio-merger.umd.js` (28,5 KB gzip,
idéntico en `public/`).

### Punto 7 — WASM bajo demanda, nunca en el arranque: ✅

- En el **primer render** de `/` (dos cargas frescas, una con navegador recién lanzado):
  `performance.getEntriesByType('resource')` → **0 recursos `/ffmpeg/`**; el único script
  del widget es `http://localhost:3000/audio-merger/audio-merger.umd.js`.
- El selftest tiene un **caso dedicado** («WASM no se carga en el arranque») que verifica
  exactamente eso **y PASA** («ningún recurso /ffmpeg/ en el primer render; el único script
  inicial es audio-merger.umd.js»).
- El motor (32.232.419 B de `ffmpeg-core.wasm` en `public/ffmpeg/core/`) solo aparece en
  la pestaña de red tras pulsar «Unir audios» (la primera unión de mi sesión tardó ~7 s de
  `running`, coherente con carga fría del core).

---

## COMPROBACIONES POR DEFECTO A–G

**A. Cero hardcoding: ✅ (con 1 nit).** `config/defaults.ts` centraliza TODOS los
límites/umbrales/URLs/pesos con comentarios justificativos (350 MB bajo techo móvil,
2 GB/8 GB WORKERFS, threshold 50, tolerancias…); formatos/bitrates en el registro
(`index.ts:registrarBuiltins` sobre `config/registry.ts`); TODOS los textos en
`i18n/es.ts` con test de completitud por código de error. Las cadenas castellanas fuera de
i18n son mensajes técnicos de `MergeError` (convención declarada en D-07 con su limitación).
*Nit no bloqueante 2:* el fallback `?? 'mp3'` de `audio-merger-element.ts:147–149` (y el
estado inicial `:56`) está cableado en el elemento en vez de derivarse del registro.

**B. Extensibilidad (Regla del Carro): ✅.**
- **OPUS como entrada**: caso del selftest en navegador REAL ejecutado por mí (registro por
  API + unión OPUS+MP3 → reencode, 5000 ms, contenedor válido). ✅
- **OGG como salida**: test unitario `registry.test.ts:90–116` (registro + enum dinámico +
  regla de copia vorbis→ogg) **+ E2E ejecutado por mí en el navegador** registrando OGG por
  API y uniendo `ruido.oga+ruido.oga` → `{strategy:"copy", mimeType:"audio/ogg", size:46619,
  durationMs:4000, sniffOgg:true, warnings:[]}`. ✅
- **Fundido como post-proceso**: caso del selftest (fade 200 ms) PASS. ✅
- **Flujo UI → registro → validación → estrategia → motor → blob → descarga mostrado
  end-to-end**: demo (UI) + selftest (registro→validación→estrategia→motor→blob) +
  `el.download()` interceptado (`<a download="…mp3" href="blob:…">`). ✅

**C. Escalabilidad (Lista Infinita): ✅ con DEFECTO BLOQUEANTE asociado.** Virtualización
condicional re-verificada por mí en Chromium: con 60 pistas → **solo ~11 filas de la
ventana montadas** (+3 fantasma, ver defecto 1), espaciador `4320px` (60×72),
`scrollHeight 4533`, `clientHeight 480` (maxHeightPx), nota virtual visible; test jsdom en
suite («55 pistas… SOLO la ventana montada») y sondas Chromium de los árbitros F5 previos.
**Claves UUID estables**: verificadas por ejecución (regex UUID v4 OK; tras `reorder` el
CONJUNTO de ids es idéntico y solo cambia el orden). **PERO** la promesa de
`docs/rendering.md` («borrado para ids fuera del orden») es FALSA para removeTrack/clear
(defecto bloqueante 1). *Nit:* README dice «Pistas: sin límite práctico» mientras api.md
documenta `max-tracks` por defecto 500.

**D. Tolerancia a fallos: ✅.** Taxonomía clasificada y con mensaje+consejo i18n por código
(test de completitud). Verificado E2E por mí en navegador: `CORRUPT_FILE` (código + fila
marcada `invalid` con chip «No se puede unir» + panel ««roto.mp3» está dañado o no es un
audio válido.» + consejo, sin tokens crudos), `USER_CANCELLED` (selftest),
`UNSUPPORTED_FORMAT` (anuncio «Pista rechazada: raro.xyz — Formato no admitido: xyz», sin
fila), `TOO_MANY_TRACKS` (2 de 3 añadidas, anuncio interpolado), `NOT_ENOUGH_TRACKS`,
`CONFIG_INVALID` (panel con atributo citado: «atributo «max-tracks» con valor «muchos»»).
OOM/BROWSER_UNSUPPORTED/CSP-WASM_LOAD_FAILED en `core/errors.ts` + `engine/loader.ts` con
tests unitarios. Nulos distinguibles (`durationMs: null` → «duración desconocida», D-10,
tests jsdom). `WORKERFS_UNAVAILABLE` sin degradación silenciosa (D-05).

**E. Anti-sobreingeniería: ✅.** Registro (D-04), estrategias (D-04), reducer (D-03, con
sección «Anti-sobreingeniería»), worker propio (D-02 con 2 alternativas descartadas),
virtualización propia (D-06 con 3 alternativas): todos con problema/coste/alternativa.

**F. Sin afirmaciones no reproducibles: ✅.** «191 tests» → `bun run test` (reproducido);
«28,5 KB gzip» → `gzip -c` (reproducido: 28.522 B); «12 casos» → `/selftest.html`
(reproducido: 12/12); «< 60 s» → protocolo §12 + mi cronometraje (19,1 s); memoria declarada
como «supuesto declarado, no medido» (README:135, plan §4); MT declarado NO verificado con
procedimiento en plan §12 (README:161–165). El worklog final pega salidas reales.

**G. Comandos exactos: ✅.** README §Desarrollo: `bun install`, `bun run test`
(191), `bun run typecheck`, `bun run build`, `bun run fixtures`, `bun run sync:demo`,
`bun run dev` — todos mapean a scripts reales de `audio-merger/package.json`;
`scripts/sync-host.sh` existe e implementa el layout D-13 documentado. Además ejecuté
`bun run lint` del host → **exit 0** (verifica el claim «lint limpio» del worklog).

---

## DEFECTOS BLOQUEANTES

### 1. Filas fantasma: `removeTrack()` y `clear()` nunca eliminan los nodos del DOM (FASE 5)

**Causa raíz (leída en el código):** `removeTrack()` hace `this.filas.delete(id)` y
`clear()` hace `this.filas.clear()` **ANTES** de llamar a `renderizarLista()`. El único
código que hace `fila.remove()` es el bucle de huérfanas de `renderizarLista()`, que itera
`this.filas` — ya vaciado de los ids eliminados — y la rama vacía (`orden.length === 0`),
que también itera el mapa ya vacío. Resultado: los nodos `li[data-id]` quedan en el DOM
para siempre.

**Evidencia ejecutada (Chromium real, artefacto servido):**

1. **Vía botón UI «Vaciar lista»** (sesión limpia, cero API): añado `ui-a.mp3`+`ui-b.mp3`
   → 2 pistas, 2 filas → clic en «Vaciar lista» → `tracks=0` pero **2 filas fantasma
   permanecen y A LA VEZ se muestra «Aún no hay pistas. Añade audios…»**. Captura:
   `/tmp/ghost-rows-after-clear.png`.
2. **Vía API, acumulación:** `clear()` + re-añadir (`alpha`, `beta`) → estado 2 pistas pero
   **5 filas visibles** (`uno`, `dos`, `tres`, `alpha`, `beta`) con numeración duplicada
   (1,2,1,1,2). Tras otro `clear()`: `tracks=0`, **5 filas fantasma + mensaje de lista
   vacía simultáneos**.
3. **`removeTrack()` (sesión limpia):** 3 pistas/3 filas → `removeTrack(r2)` → `ok:true`,
   `tracks=2` pero **3 filas** y el ORDEN VISIBLE queda corrupto: `[r2, r1, r3]` (la fila
   eliminada no se quita y las vivas se re-appendean detrás).
4. **Botones muertos:** el botón ✕ de una fila fantasma sigue **habilitado**
   (`disabled === false`) y `removeTrack(ghostId)` es un no-op silencioso.
5. Contaminación de métricas: mi sonda de virtualización con 60 pistas midió
   `filasEnDom=14` = 11 de ventana + **3 fantasma** de una lista previa;
   `scrollHeight 4533 = 4320 (espaciador) + 213 (fantasmas en flujo)`.

**Contradicción con la documentación:** `docs/rendering.md` («Claves estables…»):
«`filas: Map<id, HTMLLIElement>` se reconcilia… **borrado para ids fuera del orden**» —
falso para las dos vías de eliminación. Misma clase que los bloqueantes «afirmación falsa
sobre el código» de F2/F4/F5.

**Por qué la suite no lo ve:** `tests/ui-elemento.test.ts:130–133` solo comprueba el
retorno/estado de `removeTrack`; ningún test afirma `lista.querySelectorAll('li[data-id]')
.length === tracks.length` tras eliminar, ni 0 filas tras `clear()`.

**Fix prescrito (2 líneas + 2 tests):** eliminar el pre-borrado del mapa — quitar
`this.filas.delete(id)` de `removeTrack()` y `this.filas.clear()` de `clear()` (el bucle de
huérfanas y la rama vacía de `renderizarLista()` ya hacen `fila.remove()` + limpieza del
mapa) — y añadir tests jsdom: tras `removeTrack`, nº de filas === nº de pistas; tras
`clear()`, 0 filas `li[data-id]` y `.am-vacia` presente SIN fantasmas. Re-verificar en
Chromium las 3 repros de arriba.

---

## DEFECTOS NO BLOQUEANTES

1. **Panel de error duplica el mensaje:** `am-error__titulo` y `am-error__detalle` reciben
   `mensajeDeError(err,true)` y `(err,false)`, que devuelven el MISMO string siempre que
   exista la plantilla i18n (siempre, por el test de completitud). El usuario ve el mismo
   texto dos veces en TODOS los paneles de error (verificado con CONFIG_INVALID y
   CORRUPT_FILE). Fix: título genérico (`t('estado.error')`) o detalle vacío.
2. **Fallback `'mp3'` cableado** en `src/ui/audio-merger-element.ts:147–149`
   (`opciones.format ?? 'mp3'`) y estado inicial (`:56`), en vez de derivarse del registro
   de salidas. Si un host des-registra mp3, el default apunta a un formato inexistente
   ( INVALID_OPTIONS en merge). No documentado como constante técnica.
3. **«Pistas: sin límite práctico»** (README:139 y page.tsx:55) vs `api.md:16`
   (`max-tracks` por defecto **500**): imprecisión de redacción en la tabla de límites.
4. Residuales heredados ya declarados por árbitros anteriores (sin regresión observable en
   mis sondas): `avisoPendiente` sin consumidor en la UI; `marcarPistasInvalidas` solo con
   `details.ids`; filas a 72 px fijas en modo virtual; clear/reset mid-job dejan estado
   final `cancelled` con lista vacía (matiz no documentado en rendering.md).

---

## NO VERIFICADO (con procedimiento de reproducción)

1. **Motor multi-thread (COOP/COEP) E2E** — declarado NO verificado en README:161–165
   («la batería del navegador solo verifica ST») y en plan §12. El fallback/ST **SÍ** está
   verificado por mí (selftest 12/12 con core ST autohospedado; `crossOriginIsolated` es
   false en la demo). Repro: servir el host con `Cross-Origin-Opener-Policy: same-origin` +
   `Cross-Origin-Embedder-Policy: require-corp`, copiar `core-mt` a
   `/ffmpeg/core-mt/`, `engine-mode="multi"`, repetir selftest.
2. **Prueba de humo de memoria** (salida creciente → aviso 350 MB → `ENGINE_RESTARTED`)
   — declarada en plan §12, no ejecutada E2E por nadie. Repro: unir N copias de fixtures
   hasta >350 MB con `warn-output-mb` reducido y observar aviso/reinicio.
3. **DnD físico con ratón y scroll con rueda real** — limitación del evento sintético ya
   declarada por el árbitro F5. Repro: CDP `Input.dispatchMouseEvent` o sesión interactiva.
4. **`bun run build`, `bun run fixtures`, `bun run sync:demo`** — no ejecutados por mí para
   no modificar artefactos del proyecto (`dist/`, fixtures, `public/`). Los scripts existen
   en package.json y `sync-host.sh` fue leído (implementa el layout D-13). Repro: copia
   scratch del repo + ejecutar los tres.
5. **Reproducibilidad bit a bit de `ruido.oga`/`tono-550.opus`** — serial OGG aleatorio
   DECLARADO en plan §4/D-12; verificado con hashes por el árbitro F1 (6/8 idénticos).
   No re-ejecutado por mí (sobrescribiría los fixtures). Repro: generate.sh en /tmp + sha256.
6. **Firefox/Safari reales** — matriz declarada (README:143–149); este entorno solo tiene
   Chromium. Repro: manual/BrowserStack.

---

## SALIDAS REALES DE TODO LO EJECUTADO

```
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/        → 200
$ agent-browser open http://localhost:3000/                             → ✓ página demo
  primer render: recursos = [/audio-merger/audio-merger.umd.js, logo.svg, woff2]
  ffmpegResources = 0 · scriptsWidget = [audio-merger.umd.js]

RUTA DORADA: t0=07:00:59.746Z → ejemplos → filas → "Bajar tono-440-est.mp3"
  → ["voz-sim.wav","tono-440-est.mp3","tono-660.m4a"] → "Unir audios"
  → state: running, running, completed (poll 3)
  → performance.now()-t0 = 19105.8 ms
  → result: {name:"audio-unido-20261027-0701.mp3", durationMs:7050, blob.size:169944,
             warnings:[], mimeType:"audio/mpeg"} · botón "Descargar · audio-unido-…mp3"

SUBIDA REAL (upload al input del shadow DOM): tono-440-est.mp3 (48944 B, 3000 ms) +
  tono-220.flac (45136 B, 3000 ms) → merge → {size:145493, durationMs:6030,
  strategy:"reencode", warnings:[]} en 1215 ms (motor caliente)
DOWNLOAD(): <a download="audio-unido-20261027-0708.mp3" href="blob:http://localhost:3000/…">

$ cd /home/z/my-project/audio-merger && bun run test
 Test Files  14 passed (14)
      Tests  191 passed (191)
exit=0 (sin «Errors»)
$ bun run typecheck → exit 0
$ bun run lint (host) → exit 0

SELFTEST (2 sesiones Chromium, 1ª de ellas con navegador recién lanzado):
  {"pasadas":12,"total":12} · terminado=true
  (detalle completo de los 12 casos en el Punto 3)

$ gzip -c dist/audio-merger.umd.js | wc -c → 28522
$ gzip -c dist/audio-merger.es.js  | wc -c → 32239
$ cmp dist/audio-merger.umd.js public/audio-merger/audio-merger.umd.js → idénticos
$ ls public/ffmpeg/core/ → ffmpeg-core.js (112059) + ffmpeg-core.wasm (32232419)

$ ffprobe tests/fixtures/* → 7 formatos válidos (códecs/tasas/duraciones correctas);
  roto.mp3 → "Failed to find two consecutive MPEG audio frames"
$ ffprobe /tmp/union-arbitro.mp3 (blob extraído del navegador) → mp3 44100 Hz 2 canales,
  duration 6.060408, size 97428, bit_rate 128609 · ffmpeg decode → exit 0

GREPS (TODO|FIXME|XXX|Lorem|ipsum|example\.com|placeholder, -i):
  src/ docs/ demo/ README.md → solo «todo/TODOS» castellano (falsos positivos);
  FIXME|XXX|Lorem|ipsum|example.com|placeholder en todo el paquete → 0 coincidencias

$ grep -ao WORKERFS node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js | wc -l → 21

DECISIONES: 14/14 archivos D-01..D-14 con Problema/Decisión/Coste/Alternativa descartada.

REPRO DEL DEFECTO BLOQUEANTE 1 (Chromium, artefacto servido):
  A) Botón UI «Vaciar lista»: antes {tracks:2, filas:2} → clic →
     {tracks:0, filas:2 (fantasma), .am-vacia visible}  → captura /tmp/ghost-rows-after-clear.png
  B) API: clear+add(alpha,beta) → {tracks:[alpha,beta], filas:[uno,dos,tres,alpha,beta]}
     → clear() → {tracks:0, filas:5, vacia:true}
  C) removeTrack (sesión limpia): antes {tracks:3, filas:3} → removeTrack(r2) →
     {ok:true, tracks:2, filas:3, nombresVisibles:[r2, r1, r3]}
  D) Botón ✕ de fila fantasma: disabled=false · removeTrack(ghostId) → no-op sin error

EXTENSIBILIDAD (ejecutado por mí en navegador):
  OGG salida (registro por API + unión real): {strategy:"copy", mime:"audio/ogg",
    size:46619, durationMs:4000, sniffOgg:true, warnings:[]}
  VIRTUALIZACIÓN (60 pistas): filas montadas ≈ 11 (+3 fantasma del defecto 1),
    espaciador 4320px, scrollHeight 4533, clientHeight 480
  CLAVES: idEsUuid=true · tras reorder(0,2): mismoConjuntoIds=true, ordenCambio=true

ERRORES E2E (navegador real): NOT_ENOUGH_TRACKS · UNSUPPORTED_FORMAT (anuncio
  "Formato no admitido: xyz", sin fila) · TOO_MANY_TRACKS ("Se alcanzó el máximo de 2
  pistas.", 2 de 3 añadidas) · CONFIG_INVALID (panel con atributo citado) ·
  CORRUPT_FILE (código + fila invalid + chip + panel interpolado, merge abortado)

dev.log del host durante toda la sesión: 0 errores, todas las respuestas 200.
```

---

## CÓMO REPRODUCIR CADA VERIFICACIÓN

| Verificación | Comando / procedimiento exacto |
|---|---|
| Ruta dorada < 60 s | `agent-browser open http://localhost:3000/` → eval `window.__t0=performance.now()` → clic «Cargar 3 audios de ejemplo» → clic «Bajar <nombre>» → clic «Unir audios» → sondear `document.querySelector('audio-merger').state` hasta `completed` → eval `performance.now()-window.__t0` |
| Subida real | `agent-browser snapshot -i` → localizar input file del shadow DOM → `agent-browser upload @ref <fixture>` |
| Tests unitarios | `cd /home/z/my-project/audio-merger && bun run test` (esperar `Tests 191 passed` y exit 0) |
| Batería navegador | `agent-browser open http://localhost:3000/selftest.html` → sondear `window.__selftest.terminado === true` → leer `window.__selftest.pasadas` / `.resultados` |
| Fixtures | `ls -la audio-merger/tests/fixtures/` + `ffprobe -v error -show_entries format=format_name,duration <file>` |
| Bundle gzip | `gzip -c audio-merger/dist/audio-merger.umd.js \| wc -c` → 28.522 |
| WASM diferido | En `/` sin unir: `agent-browser eval "JSON.stringify(performance.getEntriesByType('resource').map(r=>r.name))"` → sin `/ffmpeg/`; caso 0 del selftest |
| Placeholders | `grep -rniE "TODO\|FIXME\|XXX\|Lorem\|ipsum\|example\.com\|placeholder" audio-merger/{src,docs,demo} audio-merger/README.md` |
| Defecto bloqueante 1 | Página limpia → añadir 2 audios → clic «Vaciar lista» → contar `el.shadowRoot.querySelectorAll('li[data-id]').length` (≠ 0) y `.am-vacia` presente; o `el.removeTrack(el.tracks[0].id)` y recontar filas |
| Error panel duplicado | `document.createElement('audio-merger')` con `max-tracks="muchos"` → leer `[data-ref=error].innerHTML` (titulo === detalle) |
| OGG salida E2E | En `/selftest.html`: `AudioMerger.registrarFormatoSalida({id:'ogg',…,sniff:AudioMerger.esOgg,codecsNativosParaCopia:['vorbis']})` + `crearUnion({engine:{base:'/ffmpeg'}}).merge([ruido.oga,ruido.oga],{format:'ogg'})` |
| Salida válida independiente | Extraer `result.blob` a base64 por eval → `base64 -d` → `ffprobe` + `ffmpeg -v error -f null -` |

---

## CONCLUSIÓN Y CONDICIÓN DE REAPERTURA

Todo el LISTÓN objetivo (7 puntos) está verificado en verde con ejecución propia, y el
proyecto conserva una honestidad epistémica excepcional (lo no verificable está declarado
con procedimiento). **Un único defecto bloqueante** — filas fantasma tras
`removeTrack()`/`clear()` — tumba la entrega y devuelve el trabajo a **FASE 5** (render de
listas / reconciliación). La corrección es de ~2 líneas + 2 tests; con ella aplicada (y de
paso, idealmente, los 3 no bloqueantes), el árbitro final solo necesitará re-ejecutar las
repros del defecto 1, `bun run test` y una pasada del selftest para aprobar.

---

# Ronda 2 del árbitro final (re-auditoría del fix) — 2026-10-27 07:34 UTC

**Contexto:** el autor corrigió el único bloqueante de la Ronda 1 (filas fantasma) y los 3
no bloqueantes. Se reconstruyó y re-sincronizó el artefacto (dist/ y public/ con timestamp
07:26, `cmp` → **idénticos**). Esta ronda re-ejecuta, con herramientas propias, la condición
de reapertura EXACTA que fijé en la Ronda 1: «re-ejecutar las repros del defecto, `bun run
test` (exit 0) y una pasada del selftest».

## 1. Verificación del BLOQUEANTE (filas fantasma) — RESUELTO ✅

**Código (leído):** `removeTrack()` ya NO hace `this.filas.delete(id)` y `clear()` ya NO
hace `this.filas.clear()` — ambos con comentario que cita la regresión; el bucle de huérfanas
de `renderizarLista()` (y su rama vacía, que hace `fila.remove()` + `filas.clear()`) es ahora
el único dueño del DOM de filas. Exactamente el fix prescrito (2 líneas).

**Mis repros originales, re-ejecutadas en Chromium real (navegador fresco, artefacto
servido = public/, idéntico a dist/):**

| Repro (Ronda 1 → resultado viejo) | Resultado Ronda 2 |
|---|---|
| R1 API: 3 pistas/3 filas → `removeTrack(2ª)` | `ok:true`, **2 pistas / 2 filas**, orden visible `[g1, g3]` (antes: 3 filas y orden `[r2, r1, r3]`) ✅ |
| R1 API: `clear()` | **0 pistas / 0 filas / 0 `li[data-id]`** + `.am-vacia` «Aún no hay pistas…» **sin fantasmas** (antes: 2 filas fantasma junto al mensaje) ✅ |
| R2 UI: botón **«Vaciar lista»** (flujo primario, sesión limpia) | 2/2 → clic → **0 pistas / 0 filas / 0 `li[data-id]`** + `.am-vacia` (antes: 2 fantasmas + mensaje simultáneos) ✅ |
| R3 acumulación: clear → re-añadir (α,β) → clear → re-añadir (γ) | ciclo 1: **2 pistas/2 filas**; ciclo 2: **1 pista/1 fila** `[gamma]` (antes: 5 filas para 2 pistas con numeración duplicada) ✅ |
| R4 virtualización 60 pistas + clear | **exactamente 11 filas** (antes 14 = 11+3 fantasmas), `scrollHeight 4320` = 60×72 exacto (antes 4533 contaminado), UN salto al final → scrollTop 3840, filas 50–60; tras `clear()` → **0 filas**, espaciador `0px`+`display:none` (regresión N1 de F5 sigue cubierta) ✅ |

Además: subida REAL por el input del shadow DOM (`agent-browser upload`, 2 fixtures) tras
`clear()` → **2 pistas / 2 filas** exactas → `merge()` → reencode 145.493 B / 6.030 ms /
sin avisos (86 ms con motor caliente). Los botones muertos de la Ronda 1 desaparecen por
construcción (ya no existen filas fantasma).

**Test de regresión en la suite:** `tests/ui-elemento.test.ts:206` («removeTrack y clear no
dejan FILAS FANTASMA en el DOM (regresión del árbitro final)») afirma exactamente lo
prescrito: filas === pistas tras `removeTrack`, 0 filas + `.am-vacia` tras `clear()`. ✅

## 2. Verificación de los 3 no bloqueantes

- **NB1 (panel de error duplicado): RESUELTO** — verificado en Chromium con
  `max-tracks="muchos"`: título = mensaje de usuario («Configuración inválida: atributo
  «max-tracks» con valor «muchos»»), detalle = técnico con números exactos («el atributo
  «max-tracks» debe ser un entero (recibido: «muchos»)»). Sin duplicado; `renderizarError`
  usa `err.message` para el detalle (código leído). ✅
- **NB2 (fallback 'mp3' cableado): RESUELTO** — `audio-merger-element.ts:147–151`:
  `formatosSalidaRegistrados()[0]?.id ?? 'mp3'` con comentario («'mp3' solo como fallback
  degenerado sin registros»). El default sale del registro. ✅ *Residual trivial (no
  bloqueante): el literal `'mp3'` del `estadoInicial` (línea 56) permanece como bootstrap
  pre-atributos; se sobrescribe vía `aplicarAtributos()` antes del primer render.*
- **NB3 («sin límite práctico»): RESUELTO en README** — línea 139: «Pistas | **500 por
  defecto (configurable)**; virtualización desde 50…», coherente con api.md. ✅ *Residual
  trivial (no bloqueante): la página demo (`src/app/page.tsx:55`) conserva «Sin límite
  práctico» — copy del host de demo, no contrato de la librería.*

## 3. Re-ejecución de las verificaciones de la condición de reapertura

```
$ cd /home/z/my-project/audio-merger && bun run test
 Test Files  14 passed (14)
      Tests  192 passed (192)      (+1: el test de regresión del bloqueante)
exit=0 (sin «Errors»)
$ bun run typecheck → exit 0
$ gzip -c public/audio-merger/audio-merger.umd.js | wc -c → 28.524 B  (≤ 30 KB ✅)
$ cmp dist/audio-merger.umd.js public/audio-merger/audio-merger.umd.js → idénticos
  (Nota: el autor reportó 28.622 B; mi medición del artefacto final servido es 28.524 B —
   discrepancia trivial de medición, ambas ≤ 30 KB.)
SELFTEST (Chromium, re-ejecutado): 12/12 PASS, terminado=true
  (WASM-en-arranque, copy MP3+MP3, reencode mono/ WAV/ M4A/ FLAC→WAV, OGG, OPUS registrado,
   fundido, corrupto→CORRUPT_FILE, cancelación→USER_CANCELLED, componente completo)
RUTA DORADA re-cronometrada (misma sesión): t0 → «Cargar 3 audios de ejemplo» →
  «Bajar voz-sim.wav» (orden verificado por API) → «Unir audios» → completed en
  10.591 ms ≈ 10,6 s (< 60 s ✅); resultado MP3 242.042 B / 10.060 ms / sin avisos;
  botón «Descargar» presente.
dev.log del host durante toda la sesión: 0 errores, todas las respuestas 200.
```

## 4. Conte de rondas del loop de auditoría (proyecto completo)

| Árbitro | Fase | Rondas | Resultado final |
|---|---|---|---|
| Árbitro F1 | Plan (F1) | 3 | RECHAZADA → RECHAZADA → **APROBADA** |
| Árbitro F2 | Core puro (F2) | 2 | RECHAZADA → **APROBADA** |
| Árbitro F3 | Contratos API (F3) | 2 | RECHAZADA → **APROBADA** |
| Árbitro F4 | Motor/registro (F4) | 2 | RECHAZADA → **APROBADA** |
| Árbitro F5 | UI/Componente (F5) | 5 | RECHAZADA ×4 → **APROBADA** |
| **Árbitro final** | **Entregable (LISTÓN)** | **2** | **Ronda 1: RECHAZADO (1 bloqueante) → Ronda 2: APROBADO** |

**Total: 16 rondas de auditoría adversarial** (14 de fase + 2 finales) sobre 6 fases.
Balance de la Ronda 2: el único bloqueante está resuelto y verificado con las MISMAS repros
que lo demostraron (más la variante de virtualización, ahora sin contaminación de métricas);
los 3 no bloqueantes están resueltos; no aparece ningún defecto nuevo (sondas: reconciliación,
panel de error, upload real, merge, virtualización, clear post-virtualizar, ruta dorada,
selftest, suite, typecheck, gzip, sync dist↔public).

## VEREDICTO FINAL (Ronda 2)

# ENTREGABLE: APROBADO ✅

Los 7 puntos del LISTÓN quedaron verificados en verde en la Ronda 1 (con ejecución propia:
ruta dorada 19,1 s cronometrados, embed de 2 etiquetas sin pasos ocultos, 191/191 + fixtures
de 7 formatos + corrupto + selftest 12/12 con sniffers y duraciones reales, greps limpios,
14/14 decisiones, UMD gzip 28,5 KB, WASM jamás en el arranque + caso dedicado PASS). El único
defecto bloqueante (filas fantasma en removeTrack/clear) está RESUELTO y verificado en esta
ronda con las repros originales + test de regresión en la suite (192/192, exit 0) + selftest
re-ejecutado 12/12 + ruta dorada re-cronometrada (10,6 s) + subida real re-ejecutada. Los 3
no bloqueantes están resueltos. Quedan 2 residuales triviales declarados (literal 'mp3' de
bootstrap en estadoInicial; «Sin límite práctico» en el copy de la página demo) y el mismo
inventario «NO VERIFICADO» de la Ronda 1 (MT/COOP-COEP, prueba de humo de memoria, DnD físico,
build/fixtures/sync ejecutados por el autor no por el árbitro, OGG/Opus bit a bit,
Firefox/Safari) — todos declarados con procedimiento de reproducción.

El proyecto se entrega con: librería `@zai/audio-merger` (core puro 192/192 tests, motor
ffmpeg.wasm diferido verificado E2E en Chromium, extensibilidad demostrada en navegador con
OPUS/OGG/fundido), demo Next.js con embed literal de 2 etiquetas, documentación honesta
(D-01..D-14 + límites + no-verificados con repro) y 16 rondas de auditoría adversarial
registradas en el worklog.
