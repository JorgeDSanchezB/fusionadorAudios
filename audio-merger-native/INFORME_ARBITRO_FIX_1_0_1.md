# INFORME DEL ÁRBITRO ADVERSARIAL — Bugfix 1.0.1 «cuelgue al cargar audio» (Task ID: 19)

Proyecto: Fusionador de Audio — nativo Windows x64 (`audio-merger-native/`).
Árbitro: subagente independiente, enfoque adversarial (mismo estándar que Tasks 16).
Regla: NO se confía en ninguna afirmación del autor (orquestador, Task ID: 18); todo se
verifica por ejecución o lectura propia. Entorno: Linux Debian, **SIN Windows real** (sin
wine; se declara al final qué no se pudo verificar y con qué repro).

Nada del proyecto fue modificado por el árbitro (salvo este informe y la sección apendada
al `worklog.md`). Todas las compilaciones propias se hicieron a `/tmp` (`-o /tmp/...` y
`go build -overlay` para las sondas del paquete gui, CERO bytes escritos en el repo); la
reproducción del instalador se hizo sobre una copia en `/tmp` con `cp -p` (mtimes
preservados de los inputs).

Toolchain verificado por el árbitro: `go version go1.27.3 linux/amd64`,
`makensis v3.11-1` (con `NSISDIR=/home/z/toolchain/nsis-debs/extracted/usr/share/nsis`),
`ffmpeg/ffprobe 7.1.5`.

---

## 1. FIX EN CÓDIGO (verificación por lectura y diff)

### 1a. `runtime.LockOSThread()` presente y bien colocado

- `cmd/audio-merger/main.go:21` — `runtime.LockOSThread()` es la **primera sentencia
  ejecutable** de `main()`, ANTES de `gui.Ejecutar()` (que registra la clase y crea la
  ventana). ✓
- `internal/gui/app.go:82` — `runtime.LockOSThread()` es la **primera sentencia** de
  `Ejecutar()`, antes de `config.Validar()`, `InitCommonControlsEx`, `RegisterClassExW`
  (línea 106) y `CreateWindowExW` (línea 111). ✓ (defensa en profundidad; anidado desde
  la misma goroutine es legal y sin `Unlock` es lo correcto para una GUI de por vida).

### 1b. No queda ningún otro punto de entrada sin lock

`grep` de `LockOSThread|UnlockOSThread` en todo el repo: solo `main.go:21`, `app.go:82`
(+ citas en D-16 y README). `func main(` en `*.go`: solo `cmd/audio-merger/main.go`
(GUI) y `tools/genicon/main.go` (herramienta CLI de build, sin ventanas). **No existe
ninguna otra goroutine que cree ventanas o llame a `SendMessage`**: el worker de fusión
(`tarea.go:79-88`) solo habla con la UI vía `postMessage` (`PostMessageW`, asíncrono,
seguro entre hilos); `SendMessage`/`messageBox`/`TrackPopupMenu` solo se invocan desde
`wndProc`, es decir, desde la goroutine bloqueada al hilo. ✓

### 1c. ¿Se cambió algo más? (diff real, ignorando espacios)

```
$ git diff -w --stat HEAD -- '*.go'
 cmd/audio-merger/main.go     | 8 ++++++++     ← import "runtime" + LockOSThread + comentario
 internal/gui/app.go          | 9 +++++++++     ← import "runtime" + LockOSThread + comentario
 internal/config/defaults.go  | 2 +-            ← Version "1.0.0" → "1.0.1"
 (todo lo demás: 0 líneas)
```

**Motor intacto**: `git diff -w HEAD -- internal/audio/` = **0 líneas** en
`probe.go`, `decode.go`, `wav.go`, `merge.go`, `mp3header.go`, `pcm.go`, `errors.go` y
`motor_test.go`. La GUI no funcionalmente tocada: `controles.go`, `dialogos.go`,
`tarea.go`, `win32.go` = 0 líneas. Cambios no-Go declarados y exactos:
`nsi` (`VERSION "1.0.0"`→`"1.0.1"`), `versioninfo.json` (Fixed+Strings → 1.0.1.0),
`app.manifest` (1.0.1.0), README (nota del fix). Binarios regenerados (§6).
Cosmético no declarado (trivial): `main.go`/`app.go` re-indentados de tabuladores a
8 espacios, y varios ficheros pasan de modo 100644 a 100755 (chmod +x). Nada de esto
es semántico.

### 1d. Motor vs. lo descrito por el árbitro anterior (INFORME_ARBITRO_NATIVO.md)

El árbol actual del motor es **idéntico al commit de la 1.0.0** (HEAD `4009034`),
que ya incluía los fixes D1/D2 que el árbitro anterior exigió (aplicados en Task 17
con sus tests de regresión): `wav.go:125-134` (data declarado > físico →
`DECODE_FAILED`, comentario «D1 (árbitro)») y `mp3header.go:190-193` +
`merge.go:367-371` (cola final ≤ 4096 B / ID3v1 tolerada, comentario «D2 (árbitro)»).
Es decir: las únicas diferencias del motor respecto de la *descripción* del informe
anterior son exactamente los dos fixes que ese informe demandaba. **El bugfix 1.0.1
no añadió ni quitó una sola línea del motor.** ✓

---

## 2. SOLIDEZ DEL DIAGNÓSTICO (análisis adversarial propio)

### 2a. ¿Es la falta de LockOSThread causa plausible y SUFICIENTE del síntoma?

**Sí — mecánica verificada por razonamiento propio:**

1. Win32 entrega los mensajes de una ventana **solo a la cola del hilo que la creó**
   (`CreateWindowExW` desde la goroutine del bucle). `GetMessageW` solo examina la cola
   del hilo que lo llama.
2. Go: una goroutine bloqueada en un syscall (>~20 µs, sysmon retira su P) puede
   **reanudarse en otro hilo del SO** al volver. `GetMessageW` en reposo bloquea
   indefinidamente; `GetOpenFileNameW` (modal) bloquea segundos mientras el usuario
   navega. Ambas son trampas de migración perfectas.
3. Camino exacto del reporte del usuario («se cuelga al intentar cargar cualquier
   audio»): «Añadir audios…» → `GetOpenFileNameW` bloquea en el hilo T1 → el usuario
   elige archivos → la goroutine reanuda **en T2** → `anadirRutas` → `Sondar` (I/O) →
   `refrescarLista` → `SendMessageW(hLista, …)`: **envío cruzado a una ventana de T1,
   que ya nadie bombea** → interbloqueo: T2 espera a T1 para siempre, T1 nunca corre.
   Sin crash, sin error, ventana «no responde» permanentemente. Encaja al 100 % con el
   síntoma. (Y aún sin diálogo: el propio `GetMessageW` en reposo migra la goroutine y
   el siguiente `GetMessageW` ya se ejecuta en el hilo equivocado.)

Es EL fallo canónico Go+Win32 (documentado por el propio runtime: LockOSThread es
obligatorio para frameworks GUI). El fix lo elimina por construcción: la goroutine del
bucle queda clavada a su M; ventana, cola, bucle y `wndProc` (callback invocado por
`DispatchMessageW` en ese mismo M) viven en el mismo hilo toda la vida del proceso.

Contraste honesto: el informe del árbitro anterior (Task 16) tiene **cero menciones**
de LockOSThread/afinidad de hilo (verificado por grep). La afirmación del autor «la
auditoría estática 1.0.0 lo pasó por alto» es cierta y reconocerlo suma honestidad.

### 2b. ¿Otras causas de cuelgue en el camino de añadir audio? (búsqueda activa)

- **`dialogos.go` / `GetOpenFileNameW`**: `OPENFILENAMEW` de `win32.go` verificada por
  **aserciones en tiempo de compilación** (overlay en `/tmp`, sin tocar el repo):
  `unsafe.Sizeof = 152` exacto y los **23 offsets de campo exactos** vs `commdg.h`
  x64 (hwndOwner@8 … FlagsEx@148). `LStructSize = sizeof` correcto; buffer multiselección
  de 32768 UTF-16 (64 KiB); interpretación del buffer (dir + NUL + nombres + doble NUL)
  correcta. **No es causa de cuelgue.**
- **`probe.go`/`mp3header.go` (Sondar en el hilo UI)**: WAV/OGG/FLAC son cabecera-only
  (rápido). MP3: `EscanerMP3.Siguiente` avanza **siempre ≥ 4 bytes** (`h.Longitud < 4`
  es rechazado en `parseHeaderMP3`; cola final <4 B o basura ≤4096 B → fin limpio;
  frame truncado → error tipado). **Todos los bucles terminan: no existe cuelgue
  infinito en la sonda.** Coincide con el descarte del autor.
- **`controles.go`**: `sendMessage` solo desde el hilo UI hacia hijos creados en ese
  hilo (mismo hilo → sin interbloqueo).
- **`tarea.go`**: worker solo `PostMessage` (async, cross-thread safe); estado
  compartido bajo `mu` sin retenerlo en esperas. ✓

### 2c. Riesgos residuales declarados por ESTE árbitro (ninguno bloqueante)

1. **Congelado TEMPORAL (finito) del hilo UI con MP3 enormes**: la sonda MP3 es O(bytes)
   con lecturas de 4 B por frame (seek+read). Un MP3 del tamaño máximo admitido
   (512 MiB por archivo, `config.MaxBytesPorPista`) ⇒ ~1,2–1,5 M de frames ⇒ millones
   de syscalls ⇒ **varios segundos de «No responde»** antes de recuperarse. MP3 típicos
   (3–10 MB) ⇒ decenas de ms. Es finito y se recupera, pero la ventana no pinta
   progreso durante la adición. No introducido por 1.0.1 (preexistente).
2. **Multiselección que desborde el buffer del diálogo** (64 KiB de rutas): Windows
   devuelve 0 con `FNERR_BUFFERTOOSMALL` y el código lo trata como «cancelar» → **no-op
   silencioso** sin mensaje al usuario. Molestia UX, no cuelgue.
3. **`esperarWorker` en WM_CLOSE** bloquea el bombeo hasta que el worker note la
   cancelación (finito: el ctx se comprueba por bloque en `merge.go`), con la MessageBox
   de «¿salir?» ya cerrada. Menor.
4. Higiene preexistente de 1.0.0 (no regresión de 1.0.1): 4 claves muertas en
   `i18n/es.go` (`HintVacia`, `ErrorAbrirMulti`, `ErrorGuardarDlg`, `MsgSinPistasMp3`)
   y repo no gofmt-clean (indentación a espacios; `gofmt -l` lista 9 ficheros).
5. Los decodificadores de terceros (go-mp3/oggvorbis/flac) no son auditables línea a
   línea aquí; se confía en la suite (los cubre con entradas rotas) — riesgo teórico
   declarado, no observado.

---

## 3. COMPILACIÓN PROPIA (a /tmp, sin tocar dist/)

```
$ cd /home/z/my-project/audio-merger-native && \
  PATH=/home/z/toolchain/go/bin:$PATH GOPATH=/home/z/toolchain/gopath \
  CGO_ENABLED=0 GOOS=windows GOARCH=amd64 \
  go build -o /tmp/arbitro_fix.exe ./cmd/audio-merger
BUILD OK — /tmp/arbitro_fix.exe: PE32+ executable for MS Windows 10.00 (console), x86-64, 17 sections
```

Réplica determinista con las flags exactas de `build.sh`:

```
$ go build -trimpath -ldflags "-s -w -H windowsgui" -o /tmp/arbitro_fix_trim.exe ./cmd/audio-merger
$ md5sum /tmp/arbitro_fix_trim.exe dist/FusionadorDeAudio.exe
40a1be099cb974426553890058ce9619  /tmp/arbitro_fix_trim.exe
40a1be099cb974426553890058ce9619  dist/FusionadorDeAudio.exe
$ cmp → BINARIOS BYTE-IDÉNTICOS
```

**Conclusión fuerte: `dist/FusionadorDeAudio.exe` fue regenerado desde las fuentes
actuales con el fix (reproducible, trimpath), NO es un binario viejo re-empaquetado.**

`go vet` (GOOS=windows, ./...):

```
$ go vet ./...
internal/gui/app.go:215:32: possible misuse of unsafe.Pointer      ← ÚNICO aviso
VET EXIT=1
```

Es exactamente el falso positivo documentado (lParam de WM_NOTIFY ES un `*NMHDR`;
línea 215 tras el fix — el autor lo declaró con esa misma línea). **No hay ningún otro
aviso nuevo.** `go vet` linux (motor) EXIT=0, limpio.

Sonda adicional por overlay (`go build -overlay`, 0 bytes en el repo): aserciones de
tamaño/offset de las estructuras Win32 → **OPENFILENAMEW 152 B con los 23 offsets
exactos; WNDCLASSEXW 80 B (wndproc@8, hIconSm@72); MSG 48 B; LVITEMW 72 B; LVCOLUMNW
40 B; NMLISTVIEW 64 B; INITCOMMONCONTROLSEX 8 B** — compilación OK. (Primera pasada
con 4 valores MSDN míos erróneos falló; corregidos mis valores, todo cuadra.)

---

## 4. SUITE REAL DEL MOTOR

```
$ cd /home/z/my-project/audio-merger-native && \
  PATH=/home/z/toolchain/go/bin:$PATH GOPATH=/home/z/toolchain/gopath \
  go test ./internal/audio/ -count=1 -v -timeout 300s   (salida: /tmp/arbitro_fix_tests.txt)
ok      fusionador/internal/audio       1.989s
EXIT=0
```

Conteo verificado sobre la salida completa:

| Métrica | Valor medido | Esperado |
|---|---|---|
| `=== RUN` | **27** | 27 |
| `--- PASS` | **27** | 27 |
| `--- FAIL` | **0** | 0 |
| SKIP (cualquier forma) | **0** | 0 |

28 declaraciones `func Test` = `TestMain` + 27 tests (incluye las 2 regresiones
D1/D2, que corren de verdad con ffmpeg 7.1.5: `TestWavTruncadoRegresionD1`,
`TestMp3ConId3v1RegresionD2` — ambas PASS). ffmpeg/ffprobe presentes → el único camino
de skip del fichero (`requiereFF`) NO se activó. **27/27 exacto.**

---

## 5. CADENA DE VERSIÓN 1.0.1

| Fichero | Referencia | Verificado |
|---|---|---|
| `internal/config/defaults.go:42` | `const Version = "1.0.1"` | ✓ (lectura) |
| `resources/versioninfo.json` | Fixed: FileVersion/ProductVersion `1,0,1,0`; Strings: `FileVersion "1.0.1.0"`, `ProductVersion "1.0.1.0"` | ✓ (lectura; diff exacto 1.0.0.0→1.0.1.0) |
| `resources/app.manifest:3` | assemblyIdentity `version="1.0.1.0"` | ✓ |
| `installer/audio-merger.nsi:11` | `!define VERSION "1.0.1"`; `OutFile FusionadorDeAudio-Setup-1.0.1-x64.exe`; `VIAddVersionKey/VIProductVersion ${VERSION}.0` | ✓ |
| `README.md` | nota del fix 1.0.1 + `download/FusionadorDeAudio-Setup-1.0.1-x64.exe` | ✓ |

Binarios:

```
$ strings -e l dist/FusionadorDeAudio.exe | grep -c "1\.0\.1\.0"   → 2  (y 0 apariciones de 1.0.0)
$ strings -e l installer/FusionadorDeAudio-Setup-1.0.1-x64.exe | grep -c "1\.0\.1\.0" → 2 (0 de 1.0.0)
$ strings dist/FusionadorDeAudio.exe | grep "1\.0\.1" → presente (const Version en rodata, diálogo «Acerca de»)
```

Restos de «1.0.0» en el repo (grep completo): SOLO contextos históricos/explicativos —
D-16 (describe el bug de la 1.0.0), D-15 (histórico), README (nota de release),
comentarios de `main.go`/`app.go` (referencia al bug) e `INFORME_ARBITRO_NATIVO.md`
(documento histórico). **Ninguna referencia ACTIVA a 1.0.0 queda en ficheros vivos.**
Los instaladores 1.0.0 fueron eliminados: `download/` contiene solo
`FusionadorDeAudio-Setup-1.0.1-x64.exe` + README genérico; `installer/` solo el 1.0.1. ✓

---

## 6. BINARIOS ENTREGADOS (md5, estructura, cadena de custodia)

```
$ md5sum installer/FusionadorDeAudio-Setup-1.0.1-x64.exe /home/z/my-project/download/FusionadorDeAudio-Setup-1.0.1-x64.exe
027ea5d640bff6698fcbd6f47a3836bb  installer/FusionadorDeAudio-Setup-1.0.1-x64.exe
027ea5d640bff6698fcbd6f47a3836bb  download/FusionadorDeAudio-Setup-1.0.1-x64.exe
$ cmp → IDÉNTICOS entre sí; e IDÉNTICOS al md5 declarado por el autor (027ea5d640bff6698fcbd6f47a3836bb). ✓

$ file dist/FusionadorDeAudio.exe
PE32+ executable for MS Windows 10.00 (GUI), x86-64, 9 sections      ← PE32+ x64 GUI ✓
$ file installer/FusionadorDeAudio-Setup-1.0.1-x64.exe
PE executable (GUI), Intel i386, Nullsoft Installer self-extracting archive, 7 sections ✓
```

Tamaños (reales vs. declarados en el worklog Task 18):

| Binario | Medido | Declarado | |
|---|---|---|---|
| `dist/FusionadorDeAudio.exe` | **2.630.144 B** | 2.630.144 B | ✓ exacto |
| `installer/…Setup-1.0.1-x64.exe` | **1.074.976 B** | 1.074.976 B | ✓ exacto |

`.syso` regenerado: mtime `2026-10-29 01:13:16`, 8 s antes que el exe (`01:13:24`), que
a su vez precede al instalador (`01:13:25`) — cadena temporal idéntica al orden de
`build.sh` (icono `01:13:15` → syso → exe → instalador). El `.syso` contiene
`1.0.1.0` (UTF-16) y difiere del commit HEAD (mismo tamaño 51.106 B, contenido nuevo).
Único `.syso` del repo (sin huérfanos). ✓

**Reproducción del instalador desde cero en /tmp** (copia de nsi/licencia/exe/icono con
`cp -p`, makensis v3.11-1):

```
Total size: 1074976 / 2864249 bytes (37.5%)
$ md5sum /tmp/arb-nsis-fix/installer/FusionadorDeAudio-Setup-1.0.1-x64.exe
027ea5d640bff6698fcbd6f47a3836bb      → BYTE-IDÉNTICO al entregado (cmp OK)
```

**Cadena de custodia completa demostrada por el árbitro:**
fuentes-actuales → exe (rebuild byte-idéntico, md5 `40a1be09…`) → instalador (rebuild
byte-idéntico, md5 `027ea5d6…`) → `download/` (copia idéntica) → md5 declarado por el
autor (coincide). El instalador entregado empaqueta EXACTAMENTE el exe con el fix.

---

## 7. HONESTIDAD: worklog «Task ID: 18» vs. realidad medida

| Afirmación del autor | Realidad medida por el árbitro | Veredicto |
|---|---|---|
| Fix LockOSThread en `main()` y `gui.Ejecutar()` antes de ventana alguna | diff -w: solo eso (+17 líneas útiles en 2 ficheros) | ✓ CIERTO |
| «Sin cambios de motor/UI/instalador» | motor 0 líneas; GUI 0 líneas semánticas; nsi solo versión | ✓ CIERTO (matiz cosmético: re-indentación y chmod, ver §1c) |
| Cadena 1.0.1 en defaults/versioninfo(Fixed+Strings)/manifest/nsi/README | verificado los 5 + binarios | ✓ CIERTO |
| Motor 27/27 PASS, 0 fail, 0 skip | 27 RUN / 27 PASS / 0 FAIL / 0 SKIP (ok 1,989 s) | ✓ CIERTO |
| `.syso` con VERSIONINFO 1.0.1.0 regenerado | mtime reciente + `1.0.1.0` UTF-16 dentro | ✓ CIERTO |
| exe PE32+ x64 GUI 9 secciones (2.630.144 B) | exacto (file + stat) | ✓ CIERTO |
| instalador 1.074.976 B, 7 secciones | exacto (file + stat) | ✓ CIERTO |
| «1.0.1.0» embebida en ambos PE (`strings -e l`) | 2× en cada uno; 0× «1.0.0» | ✓ CIERTO |
| go vet limpio salvo falso positivo documentado (app.go:215) | único aviso: `app.go:215:32` — línea EXACTA | ✓ CIERTO |
| md5 download `027ea5d640bff6698fcbd6f47a3836bb` | idéntico en installer/, download/ y en mi rebuild | ✓ CIERTO |
| Instaladores 1.0.0 eliminados (higiene) | download/ e installer/ solo contienen 1.0.1 | ✓ CIERTO |
| «build reproducible en verde de extremo a extremo» | exe e instalador reproducidos byte a byte por el árbitro | ✓ CIERTO |
| Motor descartado como causa (sonda finita) | verificado §2b: WAV/OGG/FLAC cabecera-only; MP3 avanza ≥4 B/frame | ✓ CIERTO |

**Inflado o declaraciones engañosas: NINGUNA.** Todas las afirmaciones medibles
coinciden hasta el último dígito (md5, bytes, nº de secciones, línea del vet, conteo de
tests). Lo no verificable (ejecución en Windows) está honestamente declarado, igual que
en la entrega anterior.

---

## 8. REPRO PARA EL USUARIO (validación de las instrucciones de reinstalación)

Leído `installer/audio-merger.nsi` completo (107 líneas) y contrastado con la 1.0.0
(git HEAD): `IDINST = "FusionadorDeAudio"` **idéntico** en ambas versiones;
`InstallDirRegKey HKCU "Software\FusionadorDeAudio" "InstallDir"` idéntico.

- **Instalar encima de la 1.0.0**: correcto — mismo `$LOCALAPPDATA\Programs\
  FusionadorDeAudio` (detectado por InstallDirRegKey), `File` sobrescribe
  `FusionadorDeAudio.exe`/`LICENSE.txt`/`LEEME.txt`, atajos recreados, claves HKCU
  reescritas (`DisplayVersion` → 1.0.1), `WriteUninstaller` regenera
  `Desinstalar.exe`. No quedan restos de la 1.0.0.
- **Desinstalar la 1.0.0 primero**: correcto — el desinstalador borra ficheros, atajos
  y AMBAS claves de registro (incluida la que guarda InstallDir); la instalación nueva
  usa el directorio por defecto (el mismo path). Equivalente.
- Condiciones de éxito de la reinstalación que NO dependen del paquete: cerrar la app
  1.0.0 congelada antes de instalar (si el exe está en uso, NSIS pide reintentar).

**Repro sugerida en VM Windows 10/11 x64** (lo único que certifica el fix de verdad):
instalar 1.0.1 → «Añadir audios…» con 2–3 MP3 (el diálogo debe abrirse y la lista
rellenarse sin congelarse) → repetir con WAV/OGG/FLAC y con arrastre desde el Explorador
→ «Fusionar…» a WAV y a MP3 → reproducir salidas → cancelar a mitad → cerrar durante
una fusión → desinstalar y comprobar que no queda rastro (registro + atajos). Caso
límite: MP3 muy grande (≥300 MB) esperando una pausa de segundos finita (§2c.1).

---

## 9. LO QUE NO SE PUDO VERIFICAR

- **La ejecución real de la GUI 1.0.1 en Windows** (añadir audio, fusionar, cancelar,
  desinstalar): este entorno es Linux Debian sin Windows y sin wine. La corrección del
  cuelgue queda verificada por mecánica (causa raíz canónica, fix correctamente
  colocado, sin otras causas de cuelgue infinito en el camino auditado) y por
  compilación, pero **no por ejecución**. Repro: §8 (VM Windows 10/11 x64).
- La eficacia real del fix ante la máquina del usuario concreto (versión de Windows,
  antivirus, shell-extensions del diálogo de archivos) — fuera de alcance estático.
- La versión exacta de `goversioninfo` usada (el worklog dice 1.7.0; el `.syso` no la
  deja rastreable por strings). Inmaterial: el VERSIONINFO resultante (1.0.1.0) sí está
  verificado en los dos PE.
- Comportamiento en ejecución de los decodificadores de terceros ante archivos
  adversariales no cubiertos por la suite (riesgo teórico declarado).

---

## VEREDICTO: **APROBADO** ✅

Razones:

1. **El fix es real, mínimo y correcto**: `runtime.LockOSThread()` antes de cualquier
   creación de ventana, en los dos niveles declarados; sin cambios semánticos en motor,
   GUI ni instalador (diff -w = 0 líneas fuera del fix y la versión).
2. **El diagnóstico es sólido**: la mecánica hilo-afín de Win32 + migración de goroutine
   tras syscalls bloqueantes explica con precisión «se cuelga al intentar cargar
   cualquier audio», y es la causa canónica documentada de Go+Win32; mis búsquedas
   adversariales de causas alternativas de cuelgue infinito (struct del diálogo, bucles
   de la sonda, mensajes cruzados, worker) no encuentran ninguna.
3. **Todo lo medible del worklog Task 18 es exacto** (27/27 tests, md5, bytes,
   secciones, línea del vet, cadena de versión, higiene de instaladores viejos): cero
   inflado.
4. **Cadena de custodia demostrada por ejecución propia**: rebuild byte-idéntico del
   exe (md5 `40a1be09…`) y del instalador (md5 `027ea5d6…` = declarado = download/).
5. Defectos encontrados: **ninguno bloqueante**; residuales no bloqueantes declarados
   en §2c (congelado temporal finito con MP3 enormes en el hilo UI, no-op silencioso si
   la multiselección desborda el buffer del diálogo, esperarWorker bloqueante breve,
   higiene i18n/gofmt preexistente). Ninguno revive el bug reportado.

Condición única pendiente (ajena a este entorno): la confirmación en Windows real con
la repro de §8 — igual que ya se declaró en la 1.0.0, ahora con causa raíz corregida.

— Árbitro adversarial independiente, Task ID: 19.
