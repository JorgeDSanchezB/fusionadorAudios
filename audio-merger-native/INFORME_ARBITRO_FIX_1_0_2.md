# INFORME DEL ÁRBITRO ADVERSARIAL — Bugfix 1.0.2 «lista sin contenido / no puedo elegir el orden» (Task ID: 21)

Proyecto: Fusionador de Audio — nativo Windows x64 (`audio-merger-native/`).
Árbitro: subagente independiente, enfoque adversarial (mismo estándar que Tasks 16 y 19).
Regla: NO se confía en ninguna afirmación del autor (orquestador, Task ID: 20); todo se
verifica por lectura o ejecución propia. Entorno: Linux Debian, **SIN Windows real** (sin
wine; se declara al final qué no se pudo verificar y con qué repro).

Nada del proyecto fue modificado por el árbitro (salvo este informe y la sección apendada
al `worklog.md`). Todas las compilaciones y sondas propias se hicieron a `/tmp` (un `main`
propio con las estructuras copiadas a mano + aserciones en tiempo de compilación, un
programa con la lógica de reordenación replicada y ejecutada, build del exe y reproducción
del instalador sobre una copia `cp -p`): **CERO bytes escritos en el repo**.

Toolchain verificado por el árbitro: `go version go1.27.3 linux/amd64`,
`makensis v3.11-1` (con `NSISDIR=/home/z/toolchain/nsis-debs/extracted/usr/share/nsis`),
`ffmpeg/ffprobe 7.1.5-0+deb13u1`.

Nota previa: el `worklog.md` **NO contiene (todavía) la sección «Task ID: 20»** (termina en
la Task 19). Los claims auditados son los facilitados en el encargo de esta auditoría; se
contrastan uno a uno en §7.

---

## 1. FIX EN CÓDIGO (verificación por lectura y diff)

### 1a. El changeset ES exactamente el declarado

`git status --short`: 13 ficheros modificados, 2 borrados (instaladores 1.0.1 de
`installer/` y `../download/`), 5 nuevos (`docs/decisions/D-17…`, `docs/decisions/D-18…`,
`internal/gui/arrastrar.go`, `installer/FusionadorDeAudio-Setup-1.0.2-x64.exe`,
`../download/FusionadorDeAudio-Setup-1.0.2-x64.exe`). Encaja 1:1 con lo declarado.

`git diff HEAD` crudo: 15 ficheros, +551/−473. Ignorando espacios (`git diff -w`):
+138/−60. El «inflado» es re-indentación cosmética (tab→8 espacios) de `win32.go`
(606 líneas crudas vs 36 semánticas) y `es.go` (255 crudas vs 1 semántica) — mismo patrón
ya observado y perdonado en la 1.0.1, no declarado esta vez (trivial). Cambio semántico
real, fichero a fichero (todo verificado por lectura completa):

- `win32.go` (+36 semánticas): `LVM_SETITEMW +78→+76`, `LVM_SETITEMSTATE +75→+43`
  (ambos con comentario D-17); nuevas `LVM_GETITEMCOUNT=+4`, `LVM_GETITEMRECT=+15`,
  `LVM_HITTEST=+18`, `LVM_SETINSERTMARK=+166`, `LVIR_BOUNDS=0`, `LVN_BEGINDRAG=LVN_FIRST-9`,
  `WM_MOUSEMOVE=0x0200`, `WM_LBUTTONUP=0x0202`, `WM_CAPTURECHANGED=0x0215`; nuevos procs
  `SetCapture`/`ReleaseCapture`; nuevos structs `RECT`, `LVHITTESTINFO`, `LVINSERTMARK`. ✓
- `internal/gui/arrastrar.go` (NUEVO, 137 líneas): patrón clásico sin OLE —
  LVN_BEGINDRAG → `SetCapture(hwnd principal)` → `WM_MOUSEMOVE` pinta la marca de inserción
  → `WM_LBUTTONUP` reordena → `WM_CAPTURECHANGED` cancela. Leído entero (§2c). ✓
- `app.go` (+32): campos `arrastrando/dragOrigen/dragDestino`; `WM_NOTIFY` con switch
  interno (`LVN_ITEMCHANGED`→refrescarBotones, `LVN_BEGINDRAG`→iniciarArrastre con
  `NMLISTVIEW.IItem`); casos nuevos `WM_MOUSEMOVE`/`WM_LBUTTONUP`/`WM_CAPTURECHANGED`. ✓
- `controles.go` (+15): `refrescarLista` usa `HintOrden` con 2+ pistas; nueva
  `desSeleccionarTodo()` (wParam `^uintptr(0)` = −1 = «todos», idiomático de
  `ListView_SetItemState`); `seleccionar()` añade `procSetFocus(a.hLista)`. ✓
- `dialogos.go` (±63): `anadirRutas` des-selecciona todo y resalta la última añadida;
  `moverSeleccion` reescrito con MARCAS posicionales; `contieneIdx` eliminado. ✓
- `i18n/es.go` (+1): constante `HintOrden`. ✓
- `main.go` y `tarea.go`: **0 líneas de diff** (LockOSThread intacto, §2c). ✓

**Motor intacto**: `git diff HEAD -- internal/audio/` = **0 líneas** (claim CIERTA).
Resto de versiones: `defaults.go:42 «1.0.2»`, `versioninfo.json` (Fixed+Strings → 1.0.2.0),
`app.manifest:3 → 1.0.2.0`, `nsi:11 → «1.0.2»` (más OutFile/VIProductVersion), README e
`instalador-leeme.txt` actualizados, docs D-17/D-18 nuevas. Todo ✓.

### 1b. Constantes viejas en HEAD (1.0.1) — verificado por extracción propia

```
$ git show HEAD:audio-merger-native/internal/gui/win32.go | grep -n "LVM_SET"
115:  LVM_INSERTITEMW  = LVM_FIRST + 77      ← correcto ya entonces
116:  LVM_SETITEMW     = LVM_FIRST + 78      ← erróneo (D-17)
117:  LVM_SETITEMSTATE = LVM_FIRST + 75      ← erróneo (D-17; +75 es LVM_GETITEMW)
```

La declaración del autor sobre los valores viejos es EXACTA. Y la mecánica del síntoma
con esos valores: `textoItem(sub≥1)` enviaba 0x104E — que en commctrl.h es
`LVM_GETTOOLTIPS` — **matiz**: D-17 dice «+78 no es mensaje alguno del ListView»; en realidad
+78 sí está asignado (LVM_GETTOOLTIPS, de lectura, sin efecto de escritura) — la
conclusión práctica es la misma (las columnas 1..4 jamás se pintaban), pero la frase es
ligeramente imprecisa. `LVM_SETITEMSTATE=+75` hacía en realidad un `LVM_GETITEMW`
(lectura) → la selección programática nunca se aplicaba. Ambos mecanismos encajan con el
reporte del usuario (§2a).

### 1c. Estructuras nuevas — aserciones x64 EN COMPILACIÓN (sonda propia en /tmp)

Programa propio con las estructuras copiadas literalmente de `win32.go` y aserciones
`const _ = uint(unsafe.Sizeof(X) - N)` (falla la compilación si no cuadra):
**COMPILA OK** ⇒ RECT=16; LVHITTESTINFO=24 con Flags@8 e IItem@12; LVITEMW=72
(PszText@24, LParam@40); LVCOLUMNW=40; NMLISTVIEW=64 (IItem@24); NMHDR=24; POINT=8.
`LVINSERTMARK` **tal como está en el código** = 8 B — coincide con lo declarado por el
autor sobre SU struct, pero ver hallazgo H3 (§2b): la canónica lleva `cbSize` ⇒ 12 B.

### 1d. Lógica de reordenación — réplica EJECUTADA en /tmp (sin Win32)

Réplica verbatim de `moverSeleccion` (marcas) y `soltarArrastre` sobre slices:

- **moverMarcas: 12/12 casos OK** — simple en medio y en extremos (no-op), bloque contiguo
  de 2 y de 3 (subir y bajar), no contigua {1,3} y {0,2,4}: el bloque se desplaza
  exactamente un hueco como unidad y la re-selección queda en la nueva posición (marcas
  actualizadas). Ejemplo: [A,B,C,D,E] sel={1,2,3} bajar → [A,E,B,C,D] ✓.
- **soltarArrastre: 11/11 casos OK** — drag 2→5 (i<j) y 4→1 (i>j), extremos 3→0 y 0→4=n,
  no-op destino==origen y destino==origen+1, drop con destino>n y origen fuera de rango
  (guards → no-op). El ajuste `pos--` cuando destino>origen es correcto: quitar la propia
  pista desplaza el punto de inserción.
- **Algoritmo VIEJO 1.0.1 replicado (contraste)**: FALLA en bloques contiguos ≥2 en AMBAS
  direcciones (p. ej. [A,B,C,D,E] sel={1,2} subir → [B,A,C,D,E], esperado [B,C,A,D,E]):
  la comprobación `contieneIdx(sel, …)` usa índices ORIGINALES tras los primeros swaps
  («índices obsoletos», exactamente como declara el autor). **Matiz**: la afirmación
  «solo movía bien la selección simple» es imprecisa — las selecciones NO contiguas
  también se movían bien (verificado con 2 casos OK del algoritmo viejo); lo que fallaba
  era solo el bloque contiguo ≥2. Infra-declaración (lo contrario de inflar), sin impacto.

---

## 2. SOLIDEZ DEL DIAGNÓSTICO (análisis adversarial propio)

### 2a. Contraste de síntoma (K): ¿D-17 explica el reporte del usuario?

Reporte: «ya no se colgó [D-16 cumplido ✓] pero no me mostró por ningún lado que cargó y
al presionar fusionar se mezcló en desorden pues no pude elegir el orden».

**Mecánica verificada por lectura propia, paso a paso:**

1. «Los archivos SÍ estaban en a.pistas» — consistente: `anadirRutas` hace append y el
   botón Fusionar se activa por `total ≥ 2` (independiente de la selección) → la fusión
   corrió. ✓
2. «No me mostró que cargó»: con `LVM_SETITEMW=+78`, `textoItem(sub≥1)` jamás escribía
   Nombre/Formato/Duración/Info ⇒ la lista mostraba **solo la columna «#» con números**
   (LVM_INSERTITEMW +77 era correcto) y las 4 columnas de datos vacías; la barra de estado
   sí ponía «N pista(s) — …». Matiz honesto: la lista NO estaba totalmente vacía (había
   numeración y texto de estado), pero **sin nombres de archivo el usuario no podía saber
   QUÉ cargó ni qué orden tenía** — perceptivamente «no mostró que cargó». El diagnóstico
   encaja, con ese matiz.
3. «No pude elegir el orden»: (a) reordenar una lista sin nombres a ciegas es imposible de
   hecho; (b) tras CUALQUIER Subir/Bajar, `refrescarLista()` (LVM_DELETEALLITEMS) borraba
   la selección y la re-selección (con `+75`) era un no-op ⇒ Subir/Bajar morían al primer
   uso y había que re-clicar; (c) ver H1: los botones ni siquiera se habilitaban.
4. «Se mezcló en desorden»: `GetOpenFileNameW` devuelve la multiselección en el orden del
   listado del diálogo (**alfabético**), `rutasDeBuffer` lo preserva y `anadirRutas` hace
   append en ese orden ⇒ la fusión usó el orden alfabético. ✓ Cierto y verificado.

**Causas alternativas descartadas** (búsqueda activa): creación del ListView correcta
(clase `SysListView32`, `InitCommonControlsEx(0xFFFFFFFF)` antes de crear controles,
`LVS_REPORT`); columnas insertadas con `+97` correcto (las cabeceras SÍ se veían);
`WM_NOTIFY` no roto (LVN_ITEMCHANGED→refrescarBotones llegaba; que Fusionar se activara
prueba que el flujo vivía); `LVS_SHOWSELALWAYS` presente. No hay otra causa plausible de
«columnas de datos vacías» ni de «selección programática inerte» FUERA de las dos
constantes… y de la tercera que el autor pasó por alto (H1).

**Conclusión del contraste**: D-17 es real y explica la mayor parte del reporte, PERO es
INCOMPLETO: `LVM_GETSELECTEDCOUNT` errónea (H1) explica «no pude elegir el orden» incluso
con clic manual del usuario, y sigue SIN corregirse en la 1.0.2.

### 2b. HALLAZGOS PROPIOS (no declarados por el autor)

> Método: no hay `commctrl.h` en este entorno (buscado en disco: nada). Los valores
> canónicos se establecen por reconstrucción del encabezado del SDK con anclajes
> fuertemente atestiguados y series aritméticamente forzadas. Se indica la confianza.
> Evidencia reveladora adicional: la tabla «canónica» del informe 1.0.0 (Task 16,
> INFORME_ARBITRO_NATIVO.md §4) daba por BUENOS `+78` y `+75` — los dos valores que D-17
> demostró erróneos — y también bendecía `+50`: esa tabla no es evidencia fiable. La
> «tabla canónica» del enunciado de esta auditoría repite los valores del autor
> (p. ej. GETITEMRECT=+15), tampoco es evidencia independiente.

**H1 — ALTO (preexistente desde 1.0.0, NO corregido en 1.0.2):**
`LVM_GETSELECTEDCOUNT = LVM_FIRST + 50` (win32.go:133) — el canónico es **+48** (0x1030).

- Reconstrucción: la serie canónica +43…+49 es contigua y completa: SETITEMSTATE(43),
  GETITEMSTATE(44), GETITEMTEXTA(45), SETITEMTEXTA(46), SETITEMCOUNT(47),
  **GETSELECTEDCOUNT(48)**, SETITEMPOSITION32(49). Anclajes: 0x102B (+43) es el propio
  fix D-17 (correcto); 0x102F (+47, SETITEMCOUNT) y 0x1031 (+49, SETITEMPOSITION32) son
  clásicos de pinvoke/VB6; el patrón A→W (+70) valida 45/46↔115/116 igual que
  5/6↔75/76/77. **+50 no está asignado a mensaje alguno del ListView.** Confianza ~96 %.
- IMPACTO: `refrescarBotones()` (controles.go:209) computa
  `n = sendMessage(hLista, LVM_GETSELECTEDCOUNT, 0, 0)`; con +50 el control devuelve 0
  siempre ⇒ `sel=false` ⇒ **los botones «Quitar», «Subir» y «Bajar» jamás se habilitan**
  — ni tras añadir pistas (ahora sí seleccionadas por el fix D-17) ni tras selección
  manual del usuario. En la 1.0.1 esto explica la mitad del reporte incluso clicando a
  mano (los botones nunca se encendieron); en la **1.0.2 SIGUEN MUERTOS**. El usuario
  podrá reordenar arrastrando o con Alt+↑/↓ (ambos caminos no dependen de esa constante:
  `LVM_GETNEXTITEM=+12` es correcto), pero README e `instalador-leeme.txt` — que se
  actualizan en ESTA release — siguen prometiendo «reordena con los botones Subir/Bajar»
  como primera vía. Riesgo alto de un tercer reporte del usuario («los botones siguen
  grises»).

**H2 — MEDIO (INTRODUCIDO en 1.0.2):** `LVM_GETITEMRECT = LVM_FIRST + 15` (win32.go:123) —
el canónico es **+14** (0x100E); **+15 es LVM_SETITEMPOS**.

- Reconstrucción: serie 12–18 canónica: GETNEXTITEM(12), FINDITEMA(13), GETITEMRECT(14),
  SETITEMPOS(15), GETITEMPOSITION(16), GETSTRINGWIDTHA(17), HITTEST(18). Anclajes: 0x100C
  y 0x1012 (HITTEST — usado por el propio arrastrar.go) están firmemente atestiguados ⇒
  0x100E queda forzado para GETITEMRECT. Confianza ~96 %.
- IMPACTO: `posicionInsercion()` usa LVM_GETITEMRECT para decidir «mitad inferior de la
  fila → insertar después». Con +15 (= LVM_SETITEMPOS, mensaje de vistas icono, inaplicable
  en `LVS_REPORT`) el control devuelve FALSE ⇒ el refinamiento de mitad de fila NUNCA se
  aplica: el punto de inserción queda anclado al borde superior de la fila golpeada. El
  arrastre sigue funcionando y todos los índices 0..n siguen siendo alcanzables («después
  de i» = cursor sobre la fila i+1; el final, en la zona vacía bajo la última fila), pero
  con menor precisión que la declarada en D-18. Sin crash ni efecto lateral (en vista
  informe SETITEMPOS no reordena y solo LEE el POINT de lParam).

**H3 — MEDIO (INTRODUCIDO en 1.0.2):** `LVINSERTMARK` sin el campo inicial `cbSize`.

- La estructura canónica es `{UINT cbSize; DWORD fAfter; int iItem}` = **12 B** (x64); la
  del código son 8 B con `FAfter` en el offset 0. `LVM_SETINSERTMARK` valida `cbSize` y
  devuelve FALSE si no coincide con `sizeof(LVINSERTMARK)` (así lo documenta MSDN y así lo
  implementa p. ej. Wine). Con la struct del código el control lee `cbSize = FAfter`
  (0 ó 1) ≠ 12 ⇒ **la marca de inserción JAMÁS SE PINTA**: la guía visual de D-18 (su
  raison d'être perceptiva) no existirá en Windows real. El arrastre en sí funciona igual
  y no hay corrupción (el control solo LEE 12 B de un valor de 8 B en el stack: los 4 B
  extra son lectura benigna de memoria adyacente). Confianza ~92 %.

**H4 — BAJO: re-entrada por teclado durante el arrastre.** `moverSeleccion`,
`quitarSeleccion` y `anadirArchivos` no consultan `a.arrastrando`. Durante un arrastre
(botón izquierdo mantenido) el bucle sigue bombeando el teclado: Alt+↑/↓ o Supr mutan
`a.pistas` y dejan `dragOrigen/dragDestino` obsoletos ⇒ al soltar, el bounds-check evita
el crash y en el peor caso se mueve la pista equivocada. Los caminos modales (diálogo de
archivos, menú contextual) se auto-curan vía WM_CAPTURECHANGED. Caso raro e impacto
mínimo, pero el guard (`if a.arrastrando { return }`) es gratis.

**H5 — nota:** `LVM_GETITEMCOUNT (+4)` se añade en esta release pero no se usa en ningún
sitio (igual que el preexistente `LVM_GETSELECTIONMARK +66`). Constantes muertas,
inofensivas. La claim de constantes nuevas es literalmente cierta, pero una de ellas
(GETITEMRECT) llega con valor erróneo (H2) y otra (SETINSERTMARK) llega bien pero con su
struct mal definida (H3): la 1.0.2 corrige dos constantes mal transcritas e introduce dos
errores nuevos de la misma familia, y deja una tercera sin corregir.

### 2c. Análisis adversarial del patrón de arrastre (J) — lo que SÍ está bien

- **¿LVN_BEGINDRAG llega sin estilos extendidos?** Sí: es notificación por defecto del
  ListView (cualquier vista, sin LVS_EX_*). ✓
- **¿SetCapture roba el capturador al ListView?** Sí y es intencional: el ListView recibe
  WM_CAPTURECHANGED (él, no el padre) y su estado interno de botón queda «colgado» hasta
  el siguiente clic — trade-off del patrón clásico, declarado honestamente en D-18. ✓
- **¿WM_CAPTURECHANGED cubre la pérdida?** Sí; y el orden interno de `soltarArrastre`
  (`arrastrando=false` ANTES de `ReleaseCapture()`) evita procesar el WM_CAPTURECHANGED
  propio (el handler re-comprueba `arrastrando`). Verificado línea a línea. ✓
- **¿comctl32 v6?** El manifiesto embebido declara la dependencia
  `Microsoft.Windows.Common-Controls 6.0.0.0` (app.manifest:27-31) ✓ — requisito de
  LVM_SETINSERTMARK… que de todos modos fallará por H3.
- **Re-entrada**: doble LVN_BEGINDRAG guardado (`fusionando || arrastrando`); arrastre
  durante fusión doblemente imposible (guard + lista deshabilitada con
  `enableWindow(a.hLista, !enCurso)`); drop fuera de rango: `posicionInsercion` acota a
  0..n (hit fallido → n) y `soltarArrastre` re-valida límites (probado en §1d). Queda H4
  (teclado durante drag) como único hueco.
- **D-16 intacto / hilo de UI**: `runtime.LockOSThread()` sigue siendo la primera
  sentencia de `main()` (main.go:21) y de `Ejecutar()` (app.go:87) — ambos ficheros con 0
  diff (main.go) o diff que no toca el lock (app.go). El estado del arrastre
  (`arrastrando/dragOrigen/dragDestino`) solo se toca desde `wndProc` (grep propio:
  app.go:244-256 + arrastrar.go, sin otras referencias) ⇒ hilo de UI exclusivamente. El
  worker sigue hablando solo vía `PostMessage` (tarea.go sin cambios). ✓

---

## 3. COMPILACIÓN PROPIA (a /tmp, sin tocar dist/)

```
$ cd /home/z/my-project/audio-merger-native && \
  PATH=/home/z/toolchain/go/bin:$PATH GOPATH=/home/z/toolchain/gopath CGO_ENABLED=0 \
  GOOS=windows GOARCH=amd64 \
  go build -trimpath -ldflags "-s -w -H windowsgui" -o /tmp/arb1202.exe ./cmd/audio-merger
BUILD OK — PE32+ executable for MS Windows 10.00 (GUI), x86-64, 9 sections, 2.636.288 B
$ md5sum /tmp/arb1202.exe dist/FusionadorDeAudio.exe
002c73c2985943aaa48ed09bf1957139  /tmp/arb1202.exe
002c73c2985943aaa48ed09bf1957139  dist/FusionadorDeAudio.exe
$ cmp → BINARIOS BYTE-IDÉNTICOS  (= md5 declarado por el autor)
```

**`dist/FusionadorDeAudio.exe` está regenerado de verdad desde las fuentes actuales
(reproducible, trimpath); NO es un binario viejo re-empaquetado.**

`go vet` (GOOS=windows, ./…): EXIT=1 con **exactamente 2 avisos**:

```
internal/gui/app.go:220:32: possible misuse of unsafe.Pointer
internal/gui/app.go:227:55: possible misuse of unsafe.Pointer
```

Líneas Y columnas exactas a lo declarado (los dos casts lParam→NMHDR/NMLISTVIEW del
WM_NOTIFY, falso positivo documentado del patrón). `go vet` linux (audio/config/i18n):
EXIT=0, limpio.

---

## 4. SUITE REAL DEL MOTOR

```
$ go test ./internal/audio/ -count=1 -v -timeout 300s   (salida: /tmp/arb1202_tests.txt)
ok  fusionador/internal/audio  2.077s   EXIT=0
```

| Métrica | Medido | Esperado |
|---|---|---|
| `=== RUN` | **27** | 27 |
| `--- PASS` | **27** | 27 |
| `--- FAIL` | **0** | 0 |
| SKIP (cualquier forma) | **0** | 0 |

28 declaraciones `func Test` = TestMain + 27 tests (incluye las regresiones D1/D2, PASS
con ffmpeg 7.1.5 real). Sin skips. **27/27 exacto.** ✓

---

## 5. CADENA DE VERSIÓN 1.0.2

| Fichero | Referencia | Verificado |
|---|---|---|
| `internal/config/defaults.go:42` | `const Version = "1.0.2"` | ✓ |
| `resources/versioninfo.json` | Fixed FileVersion/ProductVersion 1,0,2,0; Strings «1.0.2.0» ×2 | ✓ |
| `resources/app.manifest:3` | assemblyIdentity `version="1.0.2.0"` | ✓ |
| `installer/audio-merger.nsi:11` | `!define VERSION "1.0.2"`; OutFile …-1.0.2-x64.exe; VI… ${VERSION}.0 | ✓ |
| `README.md` / `instalador-leeme.txt` | instalador 1.0.2 + nota del fix + repro | ✓ |

Binarios: `strings -e l` → «1.0.2.0» **×2 en el exe y ×2 en el instalador; 0 restos de
«1.0.1.0» en ambos**. ✓ El `.syso` (51.106 B, mtime 02:24:30) contiene «1.0.2.0» UTF-16
×2 y 0 «1.0.1.0». Instaladores 1.0.1 eliminados: `installer/` y `download/` contienen
SOLO el 1.0.2 (+nsi/licencia/README genérico). Restos de «1.0.1» en el repo: solo
contextos históricos (D-18, notas del README) y el falso positivo `flac v1.0.14`. ✓

---

## 6. BINARIOS ENTREGADOS (md5, estructura, cadena de custodia)

```
$ md5sum installer/FusionadorDeAudio-Setup-1.0.2-x64.exe /home/z/my-project/download/FusionadorDeAudio-Setup-1.0.2-x64.exe
838f6396fb57b0d552c38a3b27dad594  installer/FusionadorDeAudio-Setup-1.0.2-x64.exe
838f6396fb57b0d552c38a3b27dad594  download/FusionadorDeAudio-Setup-1.0.2-x64.exe
$ cmp → IDÉNTICOS entre sí y al md5 DECLARADO por el autor ✓

$ file dist/FusionadorDeAudio.exe
  PE32+ executable for MS Windows 10.00 (GUI), x86-64, 9 sections      ✓ (2.636.288 B)
$ file installer/FusionadorDeAudio-Setup-1.0.2-x64.exe
  PE executable (GUI), Intel i386, Nullsoft Installer self-extracting archive, 7 sections ✓ (1.076.693 B)
```

**Reproducción del instalador desde cero en /tmp** (copia `cp -p` de
nsi/licencia/exe/icono/LICENSE/leeme; makensis v3.11-1 con NSISDIR):

```
Total size: 1076693 / 2870535 bytes (37.5%)
$ md5sum /tmp/arb1202-nsis/installer/FusionadorDeAudio-Setup-1.0.2-x64.exe
838f6396fb57b0d552c38a3b27dad594   → BYTE-IDÉNTICO al entregado y al de download/ (cmp OK)
```

Cadena temporal coherente con el orden de `build.sh`: icon.ico 02:24:30.369 →
`.syso` 02:24:30.582 → `dist/…exe` 02:24:31.010 → instalador 02:24:32.062 →
`download/` 02:24:32.070. **Cadena de custodia demostrada por ejecución propia**:
fuentes → exe (rebuild byte-idéntico, md5 `002c73c2…`) → instalador (rebuild
byte-idéntico, md5 `838f6396…`) → `download/` (copia idéntica) → md5 declarado
(coincide). El instalador entregado empaqueta EXACTAMENTE el exe con el fix. ✓

---

## 7. HONESTIDAD: claims del autor (Task 20) vs. realidad medida

| Afirmación del autor | Realidad medida por el árbitro | Veredicto |
|---|---|---|
| SETITEMW +78→+76, SETITEMSTATE +75→+43 (valores viejos exactos) | git show HEAD: +78/+75; diff: +76/+43 | ✓ CIERTO |
| Nuevas constantes/procs/structs declarados en win32.go | todos presentes (36 líneas semánticas) | ✓ CIERTO |
| arrastrar.go nuevo con patrón SetCapture→WM_MOUSEMOVE→LVM_SETINSERTMARK→WM_LBUTTONUP | leído entero; patrón y guards como se declara | ✓ CIERTO (con H2/H3 dentro) |
| app.go: campos + WM_NOTIFY + 3 casos nuevos | exacto (+32 semánticas) | ✓ CIERTO |
| controles.go: SetFocus, desSeleccionarTodo, HintOrden 2+ | exacto (+15) | ✓ CIERTO |
| dialogos.go: moverMarcas + feedback al añadir; contieneIdx fuera | exacto; lógica 12/12+11/11 OK en réplica | ✓ CIERTO |
| Motor 0 líneas de diff; 27/27 esperados | 0 líneas; 27 RUN/27 PASS/0 FAIL/0 SKIP | ✓ CIERTO |
| md5 exe = 002c73c2985943aaa48ed09bf1957139 | idéntico en mi rebuild (byte a byte) | ✓ CIERTO |
| md5 instalador = 838f6396fb57b0d552c38a3b27dad594 = download/ | idéntico en installer/, download/ y mi rebuild | ✓ CIERTO |
| «1.0.2.0» ×2 UTF-16 en cada PE; 0 «1.0.1.0» | ×2 y ×2; 0 y 0 | ✓ CIERTO |
| Instaladores 1.0.1 eliminados de installer/ y download/ | solo 1.0.2 en ambos | ✓ CIERTO |
| go vet windows: exactamente 2 avisos (app.go:220:32 y 227:55) | exactamente esos 2, con columnas exactas | ✓ CIERTO |
| Versiones 1.0.2 en las 4 fuentes + README/leeme | verificadas todas | ✓ CIERTO |
| «El algoritmo 1.0.1 solo movía bien la selección simple» | también movía bien las no contiguas; solo fallaban los bloques contiguos ≥2 | ~ IMPRECISO (infra-declarado) |
| «+78 no es mensaje alguno del ListView» | +78 es LVM_GETTOOLTIPS (lectura sin efecto) — conclusión práctica igual | ~ IMPRECISO (matiz) |
| (no declarado) re-indentación win32.go/es.go | 606/255 líneas crudas vs 36/1 semánticas | cosmético, no declarado |
| (no declarado) LVM_GETSELECTEDCOUNT=+50 | canónico +48 ⇒ botones Subir/Bajar/Quitar muertos (H1) | ✗ DEFECTO PREEXISTENTE NO CORREGIDO |
| (no declarado) LVM_GETITEMRECT=+15 | canónico +14 (H2) | ✗ DEFECTO NUEVO |
| (no declarado) LVINSERTMARK sin cbSize | canónica 12 B (H3) | ✗ DEFECTO NUEVO |

**Inflado consciente: NINGUNO** — todo lo medible cuadra al dígito (md5, bytes,
conteos, líneas/columnas del vet). Los defectos H1/H2/H3 no son engaño sino auditoría
incompleta: el autor corrigió las dos constantes que buscó y no re-auditó NI las suyas
nuevas NI las vecinas de la misma familia (la tabla «canónica» de la Task 16, que bendijo
+78/+75/+50, probablemente le dio falsa seguridad). Nota: el worklog aún no tiene la
sección «Task ID: 20».

---

## 8. REPRO PARA EL USUARIO (VM Windows 10/11 x64) — valida el fix Y mis predicciones

Instalar 1.0.2 encima de la 1.0.1 (mismo `IDINST`/`InstallDirRegKey`, verificado por
lectura del nsi — idéntico al 1.0.1; NSIS sobrescribe exe/licencia/leeme y regenera
desinstalador). Después:

1. «Añadir audios…» con 3 MP3 → **deben verse nombre/formato/duración/info** (fix D-17)
   y la última pista resaltada y con foco.
2. Arrastrar una pista a otra posición → la lista se reordena y la pista queda
   seleccionada. **Predicción H3**: NO aparecerá la marca de inserción bajo el
   cursor (drag funcional «a ciegas»). **Predicción H2**: el punto de destino se decide
   por el borde superior de la fila apuntada (para soltar «después de i», apuntar a la
   fila i+1; para el final, la zona vacía inferior).
3. **Predicción H1 (decisiva)**: los botones «Subir»/«Bajar»/«Quitar» seguirán GRIS
   incluso con una pista seleccionada a mano. Alt+↑/↓, Supr y el menú contextual SÍ
   funcionarán (no dependen de la constante errónea). Si los botones se habilitan, mi H1
   estaba equivocada y debe decírselo al árbitro.
4. Marcar 2–3 filas y Alt+↑/↓ → el bloque debe moverse como unidad exactamente un hueco
   (fix del algoritmo de marcas).
5. «Fusionar…» a WAV y a MP3 → **el orden de la salida debe ser el de la lista** (auditar
   con ffprobe/reproductor).
6. Límites: cancelar a mitad; cerrar durante fusión; arrastrar fuera de la lista
   (cancela); pulsar Alt+↓ durante un arrastre (H4: comportamiento anómalo posible, sin
   cuelgue); desinstalar y comprobar que no queda rastro.

---

## 9. LO QUE NO SE PUDO VERIFICAR

- **La ejecución real de la GUI 1.0.2 en Windows** (lista pintada, selección, botones,
  arrastre, marca de inserción, orden de la fusión): este entorno es Linux Debian sin
  Windows y sin wine. Todo §2 es análisis estático + mecánica Win32; H1/H2/H3 son
  predicciones de alta confianza (92–96 %), NO observaciones runtime. La repro §8.3 es el
  experimento decisivo.
- **`commctrl.h` original**: no existe copia local ni internet. Los valores canónicos de
  H1/H2/H3 se establecen por reconstrucción del encabezado del SDK (series contiguas
  forzadas por anclajes bien atestiguados). El autor puede confirmar cada uno en segundos
  contra el SDK/MSDN — y DEBERÍA auditar TODAS las constantes LVM/WM del fichero con el
  encabezado real, porque la tabla «canónica» de la Task 16 ya demostró no ser fiable.
- La versión exacta de `goversioninfo` (la caché de módulos tiene v1.7.0, coherente con
  build.sh `@latest`): inmaterial, el VERSIONINFO 1.0.2.0 sí está verificado en ambos PE.
- Eficacia en la máquina concreta del usuario (versión de Windows, comctl32 real, shell
  del diálogo): fuera de alcance estático.

---

## VEREDICTO: **RECHAZADO** ❌ (fix trivial para reaprobar)

Razones:

1. **Lo declarado es real y exacto**: el changeset coincide 1:1, el motor está intacto
   (27/27), la cadena de custodia es impecable (exe e instalador reproducidos byte a byte
   por este árbitro; md5 = declarados = download/) y no hay inflado consciente. Como
   *logística de release*, la 1.0.2 es ejemplar.
2. **Pero como bugfix de «constantes LVM mal transcritas» queda a medias y se dispara en
   el pie**: (a) **H1** — `LVM_GETSELECTEDCOUNT=+50` (canónico +48) mantiene MUERTOS los
   botones Subir/Bajar/Quitar en 1.0.2 igual que en 1.0.1/1.0.0: parte del síntoma
   reportado («no pude elegir el orden») sigue sin resolver por la vía que README y
   `instalador-leeme.txt` — actualizados en esta misma release — enseñan al usuario como
   primera opción; (b) **H2/H3** — el código NUEVO del arrastre introduce otros dos
   errores de la misma familia que D-17 venía a corregir (GETITEMRECT=+15 en vez de +14;
   LVINSERTMARK sin cbSize ⇒ marca de inserción jamás visible). Es la tercera release
   seguida con constantes Win32 mal transcritas: la lección de D-17 no se aplicó al resto
   del fichero.
3. **Correcciones exigidas para aprobar la 1.0.3** (4 líneas + guard, más re-auditoría):
   - `LVM_GETSELECTEDCOUNT = LVM_FIRST + 48`
   - `LVM_GETITEMRECT = LVM_FIRST + 14`
   - `LVINSERTMARK{CbSize uint32; FAfter uint32; IItem int32}` y fijar `CbSize:
     uint32(unsafe.Sizeof(m))` en `ponerMarca` (o verificar antes contra commctrl.h si se
     discrepa de H3)
   - guard `if a.arrastrando { return }` en `moverSeleccion`/`quitarSeleccion`/
     `anadirArchivos`/`vaciar`
   - re-auditar TODAS las constantes LVM/WM de win32.go contra commctrl.h (la tabla de la
     Task 16 no es fiable) y regenerar con el build.sh ya validado.
4. Con esas correcciones, y dado que la cadena de build ya está demostrada reproducible
   byte a byte, la reaprobación por parte de un árbitro sería inmediata.

La 1.0.2 ES estrictamente mejor que la 1.0.1 para el usuario (verá los archivos cargados,
podrá reordenar arrastrando o con teclado y la fusión seguirá el orden de la lista), pero
publicarla tal cual, con la documentación prometiendo botones que seguirán grises y la
guía visual del arrastre ausente, sería publicar otra vez «constantes sin verificar». Por
eso este árbitro la rechaza como release y exige la 1.0.3 correctora.

— Árbitro adversarial independiente, Task ID: 21.
