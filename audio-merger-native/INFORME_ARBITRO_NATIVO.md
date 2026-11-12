# INFORME DEL ÁRBITRO FINAL ADVERSARIAL — App nativa Windows x64 + instalador (Task ID: 16)

Proyecto: Fusionador de Audio — nativo Windows x64 (`audio-merger-native/`).
Árbitro: subagente independiente, enfoque adversarial (mismo estándar que Tasks 3/5/7/9/11/14).
Regla: NO se confía en ninguna afirmación del autor; todo se verifica por ejecución o lectura
propia. Entorno: Linux Debian 13, **SIN Windows real** (se declara al final qué no se pudo
verificar y con qué repro).

Nada del proyecto fue modificado por el árbitro (salvo este informe y la sección apendada al
`worklog.md`). Las compilaciones propias se hicieron a `/tmp` (la del instalador, sobre una
copia con `cp -p` para preservar mtimes; la del binario, con `-o /tmp`; la sonda del motor,
con `go build -overlay`, que compila un paquete virtual sin escribir un solo byte en el repo).

---

## 1. SUITE REAL DEL MOTOR

Ejecutado (comando literal del encargo):

```
$ cd /home/z/my-project/audio-merger-native && \
  PATH=/home/z/toolchain/go/bin:$PATH GOPATH=/home/z/toolchain/gopath \
  go test ./internal/audio/ -count=1 -v -timeout 300s
```

Salida real (final):

```
PASS
ok  	fusionador/internal/audio	1.913s
EXIT=0
```

Conteo verificado sobre la salida completa guardada (`/tmp/arbitro_tests.txt`):

| Métrica | Valor |
|---|---|
| `=== RUN` | **25** |
| `--- PASS` | **25** |
| `--- FAIL` | **0** |
| `SKIP` (cualquier forma) | **0** |

`func Test` en `motor_test.go`: 26 declaraciones = `TestMain` + 25 tests → cuadra exacto.
El único camino de skip del fichero es `requiereFF()` (línea 47:
`t.Skip("ffmpeg/ffprobe no disponibles: fixtures no generadas (SKIP declarado)")`), que NO se
activó (ffmpeg 7.1.5 y ffprobe presentes, y las fixtures se generaron: los 25 tests corrieron
de verdad, 1,913 s). Los tests son REALES: generan fixtures con `ffmpeg` CLI en un temp dir y
validan salidas con `ffprobe` (duración, códec, tasa, canales) y con decodificación completa
(`ffmpeg -f null`, `duracionDecodificada`). El fixture corrupto se construye truncando
`a.mp3` al 55 % + 97 bytes (a mitad de frame). **Sin skips engañosos.**

Adicional: `go vet ./internal/...` (linux) exit 0; `gofmt -l .` limpio; `go mod verify` →
`all modules verified`.

---

## 2. LISTÓN DEL PEDIDO DEL USUARIO, PUNTO POR PUNTO

Pedido literal: *"instalador .exe para windows x64, en la carpeta download, programa nativo
que contenga únicamente la herramienta"*.

### a) ¿Existe el instalador y es un NSIS real?

```
$ file /home/z/my-project/download/FusionadorDeAudio-Setup-1.0.0-x64.exe
PE32 executable for MS Windows 4.00 (GUI), Intel i386 (stripped to external PDB),
Nullsoft Installer self-extracting archive, 7 sections
$ stat -c '%s' …
1074694 bytes
```

Existe, es un instalador NSIS autoextraíble REAL, 1.074.694 bytes, 7 secciones. La copia de
`download/` es **byte-idéntica** a `installer/FusionadorDeAudio-Setup-1.0.0-x64.exe`
(md5 `087aa8726139f9d641d4e3e910b03a99` en ambas). `download/` no contiene nada más que el
instalador y un `README.md` preexistente de 34 bytes de tareas anteriores. **✓**

### b) ¿Es NATIVO?

- `dist/FusionadorDeAudio.exe`:
  ```
  PE32+ executable for MS Windows 10.00 (GUI), x86-64, 9 sections
  2628608 bytes
  ```
- Compilé yo mismo el paquete completo sin cgo:
  ```
  $ export CGO_ENABLED=0 GOOS=windows GOARCH=amd64 && go build ./...
  BUILD_ALL_EXIT=0
  ```
- Compilé yo mismo el exe con los flags de `build.sh`
  (`-trimpath -ldflags "-s -w -H windowsgui"`):
  ```
  $ go build -trimpath -ldflags "-s -w -H windowsgui" -o /tmp/arb-build/FusionadorDeAudio.exe ./cmd/audio-merger
  /tmp/arb-build/FusionadorDeAudio.exe: PE32+ executable for MS Windows 10.00 (GUI), x86-64, 9 sections
  md5 /tmp/arb-build/FusionadorDeAudio.exe      = 428c7d850c44c6131ac9da9d10ebaa4c
  md5 audio-merger-native/dist/FusionadorDeAudio.exe = 428c7d850c44c6131ac9da9d10ebaa4c
  ```
  **Rebuild BYTE-IDÉNTICO** → el exe entregado es exactamente el que produce el build
  declarado (Go puro, CGO_ENABLED=0, GUI subsystem).
- Tabla de imports del exe (objdump): únicamente `kernel32.dll / GetProcAddress` (carga
  perezosa de user32/comdlg32/comctl32/shell32 vía `NewLazyDLL`). Cero runtimes, cero
  dependencias dinámicas. Recursos PE embebidos verificados en el binario:
  `requestedExecutionLevel level="asInvoker"`, `activeCodePage …UTF-8`,
  `Microsoft.Windows.Common-Controls` (v6), `VS_VERSION_INFO`, `"FusionadorDeAudio"`
  (InternalName/OriginalFilename). **✓ NATIVO.**

### c) ¿Contiene ÚNICAMENTE la herramienta?

Leído `installer/audio-merger.nsi` COMPLETO (107 líneas). Órdenes `File` de la sección de
instalación — exactamente tres:

```nsis
File /oname=${EXE} "..\dist\FusionadorDeAudio.exe"
File /oname=LICENSE.txt "..\LICENSE"
File /oname=LEEME.txt "..\instalador-leeme.txt"
```

Nada más se instala: sin toolbars, sin runtimes, sin programas de terceros, sin servicios, sin
telemetría. Los decodificadores (go-mp3, oggvorbis, flac) son librerías Go **compiladas dentro
del propio exe** (estáticas, sin instalación) — licencias verificadas por mí en el module
cache: Apache-2.0 / MIT / Unlicense — y `LICENSE.txt` las declara. La sección opcional
«Atajo en el escritorio» solo crea un `.lnk`. Sin red: `rg '"net"|net/http|os/exec'` sobre
todo el Go del proyecto → 0 resultados.

**Verificación de contenido del ENTREGADO (no solo del script):** compilé yo mismo el
instalador con el toolchain indicado (véase §5) sobre una copia con mtimes preservados y
obtuve un instalador **byte-idéntico** al entregado (md5 `087aa872…` en ambos). Como NSIS
comprime solidamente los inputs exactos, esto demuestra que el instalador entregado fue
producido EXACTAMENTE por el `.nsi` actual con los inputs actuales: su contenido es el
declarado. **✓**

### d) ¿x64?

- El binario instalado es **PE32+ Intel x86-64** (verificado en b) — que es lo que el
  usuario ejecuta. **✓**
- El stub del instalador es PE i386: **es lo NORMAL en NSIS** (NSIS 3.11 solo distribuye
  stubs x86-unicode; la inmensa mayoría de instaladores NSIS del ecosistema son así) y
  funciona en cualquier Windows x64 vía WOW64 (presente en todos ellos). No afecta al
  requisito — el programa instalado es x64. Único matiz teórico: el instalador también
  correría en un Windows 32-bit (donde el exe no funcionaría); escenario ajeno al pedido.
  **JUICIO: no es un problema real para el requisito «x64».**

**Listón del usuario: 4/4 en verde.**

---

## 3. CALIDAD DEL MOTOR (lectura adversarial + ejecución)

### 3a. Bugs obvios buscados, archivo por archivo

**`pcm.go` (resampler streaming):** posiciones absolutas (`posAbs`, `totalSrc`) correctas:
el bucle de `Procesar` rompe cuando `i0+1 > totalSrc+n-1`, con lo que al avanzar el estado
queda `posAbs ≥ totalSrc-1` y `frameDe` nunca recibe `i < totalSrc-1` (imposible offset
negativo/panic; lo seguí algebraicamente). `Fin()` emite sostenido hasta
`posAbs ≥ totalSrc`, que produce exactamente `ceil(totalSrc·dst/src)` frames destino. El
historial `ultimo` se guarda tras cada bloque. Verificación empírica con audio real: las
duraciones de salida fueron EXACTAS (§9: 3,097 s para 1,2+0,8+1,097; 2,497 s; 3,097 s).
**Sin bug encontrado.** Detalle menor: `Procesar` descarta frames fuente incompletos del
bloque — los llamadores siempre pasan múltiplos de canales, sin impacto.

**`wav.go` (WAVE_FORMAT_EXTENSIBLE):** layout del fmt correcto: lee 16 bytes fijos +, si
formato 0xFFFE y `tam ≥ 40`, 24 bytes extra; el GUID SubFormat se toma de `ext[8:24]` =
bytes 24..40 del chunk fmt — **offset CORRECTO** (cbSize@16, validBits@18, channelMask@20,
GUID@24). Las constantes GUID PCM (`01 00 00 00 00 00 10 00 80 00 00 AA 00 38 9B 71`) y
IEEE float (`03 …`) son las estándar. Lo verifiqué contra hexdumps reales de ffmpeg
(`ext5.wav`: fmt 40 B, 0xFFFE, 6 canales, mask 0x3F, GUID PCM; `raro2.wav`: 0xFFFE, 384000
Hz, 32 bits, GUID float) y el motor los decodificó con duración exacta. Chunks ignorados
(LIST/fact) se saltan con alineación par correcta. Rangos validados (1..8 canales,
3000..384000 Hz, bits 8/16/24/32, float solo 32). NIT menor: si un fmt extensible tuviera
`tam > 40` (no estándar), los bytes sobrantes no se descartan y el siguiente chunk se
misparsea → error limpio «chunks RIFF truncados» (no corrupción). No bloqueante.

**`merge.go` — descarte de frames Xing/Info/VBRI (ventana 48 bytes):** la ventana es
`resto[:48]` (bytes 4..52 del frame) y busca la firma en CUALQUIER posición.
- Cobertura: el tag Xing/Info vive en offset 4+side-info (13..40 según versión/modo) →
  dentro de la ventana siempre; VBRI en ~36..40 → dentro. Detecta lo que debe.
- **¿Puede un falso positivo descartar AUDIO real?** Argumento cuantitativo: la ventana
  son ~45 posiciones alineadas de datos comprimidos (side info + inicio del main data);
  una firma ASCII concreta de 4 bytes tiene probabilidad ~2⁻³² por posición →
  ~45·2⁻³² ≈ 1×10⁻⁸ por frame. Un MP3 de 4 minutos tiene ~9.000 frames → ~10⁻⁴ por
  archivo, y la consecuencia sería perder UN frame (~26 ms) con posible glitch del bit
  reservoir del siguiente — no colapso ni corrupción del archivo.
- **Verificación empírica propia:** escaneé 15 MP3 reales (los míos de /tmp + los 5 del
  proyecto) frame a frame con un parser independiente en Python: 374 frames, 13
  coincidencias de firma — **las 13 eran el frame Info real del inicio de cada archivo
  (offsets 44/62, justo tras el ID3v2): 0 falsos positivos en ~360 frames de audio.**
  Además verifiqué en la salida real del modo copia que el frame Info de CADA entrada
  desaparece (§9: sin «Info»/«Xing»/ID3 en `fusion_copia.mp3`, duración = suma de frames
  de audio reales). **Diseño defendible; riesgo residual despreciable y argumentado.**
  (La alternativa de offset fijo por versión/modo sería más estricta; no es necesario.)

**Validación de truncados:** el escaneo de cabeceras detecta el frame incompleto con el
byte EXACTO. Mis cortes a mitad de frame (verificados con parser Python independiente)
devolvieron:

```
CASO trunc mid-frame   => ERROR DECODE_FAILED: MP3 truncado: el frame del byte 5686 está incompleto
CASO trunc mini (200B) => ERROR DECODE_FAILED: MP3 truncado: el frame del byte 44 está incompleto
CASO trunc 3k          => ERROR DECODE_FAILED: MP3 truncado: el frame del byte 2865 está incompleto
CASO trunc mid en copia=> ERROR DECODE_FAILED: MP3 truncado: el frame del byte 5686 está incompleto
```

(5686, 44 y 2865 coinciden exactamente con los inicios de frame calculados por mi parser
independiente.) En WAV (vía `validarMp3`) y en copia MP3 (vía `ReadFull` del resto del
frame). **Detecta bien.** Un corte que cae exactamente en frontera de frame + 1 byte
basura se tolera (comportamiento correcto: el archivo es de facto válido).

### 3a-bis. DOS DEFECTOS REALES ENCONTRADOS (no bloqueantes; ver §10)

**D1 — WAV con data declarado mayor que el físico se acorta EN SILENCIO.**
`decWav.Leer` (decode.go:85-90) trata `io.ErrUnexpectedEOF` como fin limpio: nunca compara
los bytes leídos con `info.BytesData`. Repro: `head -c 3000 raro1.wav > wtrunc.wav` (declara
9.634 B de data, tiene 2.956) → `Fusionar([raro1.wav, wtrunc.wav])` → **OK** y la salida
contiene 0,37 s de esa pista en vez de los 1,2 s declarados (la GUI mostraría 1,2 s en la
lista, que viene de `Muestras()` = bytes declarados). Curiosamente `LeerWavPCM` SÍ tiene el
error «datos WAV truncados», pero la ruta de fusión usa el lector streaming. Fix sugerido
(~4 líneas): en `decWav.Leer`, con `ErrUnexpectedEOF`, devolver `DECODE_FAILED "datos WAV
truncados"` en vez de EOF (o comparar total leído vs declarado).

**D2 — MP3 con tag ID3v1 final ROMPE el modo copia con error engañoso.**
`EscanerMP3` tolera cola final ≤ 4096 B, pero el bucle de copia de `fusionarMP3Copia` NO:
al llegar al «TAG…» devuelve «frame MP3 inválido». Repro: MP3 de ffmpeg con
`-write_id3v1 1`:
```
CASO copia mp3 (ID3v1) => ERROR DECODE_FAILED | DECODE_FAILED: frame MP3 inválido en id3v1.mp3 (byte 9090)
```
El archivo NO está dañado; el mismo archivo en salida WAV fusiona perfectamente
(`CASO id3v1->wav => OK`, duración exacta). Fix sugerido: tolerar basura final ≤ 4096 B en
el bucle de copia (simetría con el escáner), o saltar el tag ID3v1 de 128 B detectando
«TAG».

### 3b. ¿Mensajes del motor TODOS en castellano?

Grep adversarial ejecutado (`rg -n '"[A-Za-z].*[a-záéíóúñ]' internal/audio --glob '!*_test.go'`):
todos los literales de usuario del motor son castellano («cabecera RIFF ilegible», «MP3
truncado: el frame del byte %d está incompleto», «no se pudo abrir %s», «parámetros WAV
fuera de rango», «subformato extensible no admitido», …). Los únicos literales ASCII no
castellanos son identificadores técnicos ("wav"/"mp3"/"Xing"/"Info"/"VBRI"/"RIFF"/"fmt "/
"fLaC"/"OggS"/"ID3") — correcto que no se traduzcan. Errores tipados con código estable y
`fmt` inglés solo en `Error.Error()` (prefijo de código — técnico, correcto). **✓**

### 3c. ¿Literales de UI FUERA de `internal/i18n/es.go`?

HALLAZGO (menor, honestidad): existen **5 literales de UI fuera de es.go**, todos en
castellano (el requisito de idioma se cumple):

| Ubicación | Literal |
|---|---|
| `internal/gui/dialogos.go:65` | `"%d añadida(s), %d rechazada(s)"` |
| `internal/gui/dialogos.go:66` | `"%d archivo(s) no se pudieron añadir.\n\nÚltimo motivo: %s"` |
| `internal/gui/dialogos.go:110` | `"audio-fusionado." + defecto` (nombre por defecto) |
| `internal/gui/tarea.go:116` | `" (cancelando…)"` |
| `internal/gui/controles.go:249` | `"%d pista(s) — %s"` |

D-12 declara «GUI→i18n 100% / nada de la GUI inventa textos»: es ~92% cierto (5 literales
de ~60). No afecta al usuario (todo en castellano), pero la afirmación de D-12/README está
**ligeramente inflada** y debe señalarse. A cambio, es.go contiene 4 claves MUERTAS
(`HintVacia`, `ErrorAbrirMulti`, `ErrorGuardarDlg`, `MsgSinPistasMp3`) — probablemente
pensadas para esos puntos. Fuera de GUI: solo nombres de clase Win32 ("BUTTON",
"SysListView32", "msctls_progress32") y 2 mensajes técnicos de fallo catastrófico
(`"RegisterClassExW falló"`) — aceptable y declarado en D-02.

---

## 4. GUI WIN32 (lectura + compilación; NO ejecutada aquí)

**DECLARACIÓN: GUI no ejecutada aquí — compilada para windows/amd64 solamente.**
Repro para el usuario: VM Windows 10/11 x64 → ejecutar
`FusionadorDeAudio-Setup-1.0.0-x64.exe` → instalar (sin UAC) → añadir 2 MP3 → «Fusionar…» →
verificar salida con ffprobe/reproductor, atajos del menú Inicio, desinstalación completa
desde Configuración › Aplicaciones.

Verificación estática adversarial (valores contra la documentación de Win32):

| Constante | Valor en `win32.go` | Esperado | |
|---|---|---|---|
| LVM_INSERTITEMW | 0x1000+77 = 0x104D | 0x104D | ✓ |
| LVM_SETITEMW | 0x1000+78 = 0x104E | 0x104E | ✓ |
| LVM_INSERTCOLUMNW | 0x1000+97 = 0x1061 | 0x1061 | ✓ |
| LVM_SETCOLUMNWIDTH | 0x1000+30 = 0x101E | 0x101E | ✓ |
| LVM_GETNEXTITEM | 0x1000+12 = 0x100C | 0x100C | ✓ |
| LVM_SETITEMSTATE | 0x1000+75 = 0x104B | 0x104B | ✓ |
| LVM_GETSELECTEDCOUNT | 0x1000+50 = 0x1032 | 0x1032 | ✓ |
| LVM_SETEXTENDEDLISTVIEWSTYLE | 0x1036 | 0x1036 | ✓ |
| LVN_ITEMCHANGED | LVN_FIRST-1 = **-101** | -101 | ✓ |
| PBM_SETRANGE32 (tarea.go:75) | 0x406, wParam=0, lParam=1000 | min/max correctos | ✓ |
| PBM_SETPOS | 0x402 | 0x402 | ✓ |
| OFN_* (ALLOWMULTISELECT/EXPLORER/FILEMUSTEXIST/PATHMUSTEXIST/HIDEREADONLY/OVERWRITEPROMPT/NOCHANGEDIR) | todas correctas | | ✓ |
| WS/LVS/MB/MF/TPM/VK/IDC | correctas | | ✓ |

Layouts de estructuras para **amd64** (comprobados campo a campo contra el C de la SDK):
`OPENFILENAMEW` (152 B, offsets idénticos incl. el pad tras `nMaxFile`@56),
`WNDCLASSEXW` (80 B), `MSG` (48 B), `NMHDR`/`NMLISTVIEW` (24/64 B), `LVITEMW` v6 (72 B),
`LVCOLUMNW` (40 B), `ACCEL` (6 B), `INITCOMMONCONTROLSEX` (8 B). El multibuffer de
`GetOpenFileNameW` se parsea bien (dir + nombres NUL; doble NUL final; caso archivo único).
Filtros con doble NUL correctos. `DragQueryFileW` con contador 0xFFFFFFFF y buffer
largo+1 ✓. Manifiesto embebido: comctl32 v6, `asInvoker`, dpiAware sistema (coherente con
`dpiPantalla()` una sola vez), `activeCodePage` UTF-8.

- **Fuga de callback GC:** `syscall.NewCallback(a.wndProc)` sobre valor de método cuyo
  receptor `a` está vivo durante todo `Ejecutar()` (el bucle de mensajes lo referencia) y
  la clase vive todo el proceso → **sin fuga**. ✓
- **Deadlocks worker/UI:** el worker SOLO usa `PostMessage` (nunca `SendMessage`) y jamás
  adquiere el mutex mientras la UI espera; `esperarWorker()` copia el canal bajo mutex y
  espera SIN retenerlo. `onProgreso` → `PostMessage` no bloqueante. **Sin deadlock
  posible por diseño.** ✓
- **WM_CLOSE durante fusión:** MessageBox Sí/No → `cancelFunc()` → `esperarWorker()`
  (bloquea la UI hasta que el worker acaba; correcto: el worker no depende de la bomba de
  mensajes) → `DestroyWindow`. El `msgFin` encolado a una ventana destruida se descarta
  sin daño. ✓
- `go vet` (con GOOS=windows) avisa de `app.go:206: possible misuse of unsafe.Pointer`
  (cast de `lParam` de WM_NOTIFY): patrón estándar de WndProc (el puntero es válido durante
  el dispatch), falso positivo típico; no bloqueante.
- Compilación: `CGO_ENABLED=0 GOOS=windows go build ./...` → exit 0 (la GUI compila sin
  warnings salvo el vet citado).

---

## 5. INSTALADOR — COMPILADO POR EL ÁRBITRO

Toolchain indicado por el usuario. Réplica en `/tmp/arb-nsis2/` (copia de `.nsi` + inputs con
`cp -p`, preservando mtimes — NSIS embebe los mtimes de los fuentes; mi primer intento sin
`-p` difería solo por eso, 345 B y todo el bloque comprimido):

```
$ cd /tmp/arb-nsis2/installer && NSISDIR=/home/z/toolchain/nsis-debs/extracted/usr/share/nsis \
  /home/z/toolchain/nsis-debs/extracted/usr/bin/makensis audio-merger.nsi
Processing script file: "audio-merger.nsi" (UTF8)
Processed 1 file, writing output (x86-unicode):
Output: "FusionadorDeAudio-Setup-1.0.0-x64.exe"
Install: 5 pages (320 bytes), 2 sections (1 required) (8240 bytes), 370 instructions (10360 bytes),
223 strings (12034 bytes), 1 language table (338 bytes).
Uninstall: 2 pages (192 bytes), 1 section (4120 bytes), 60 instructions (1680 bytes),
107 strings (3524 bytes), 1 language table (250 bytes).
Using lzma (compress whole) compression.
Total size: 1074694 / 2862713 bytes (37.5%)
MAKENSIS_EXIT=0            (grep -ci warning → 0: CERO avisos, CERO errores)
```

**Byte-idéntico al entregado:**

```
md5 /tmp/arb-nsis2/installer/…exe = 087aa8726139f9d641d4e3e910b03a99
md5 …/installer/…exe              = 087aa8726139f9d641d4e3e910b03a99
md5 …/download/…exe               = 087aa8726139f9d641d4e3e910b03a99
```

(`makensis -VERSION` → `v3.11-1`, el declarado. Nota metodológica: con `cp` SIN `-p` el
resultado difería en 345 B y ~940 KB del stream comprimido — por los mtimes embebidos de
los `File`; con mtimes idénticos, determinismo total.)

Verificación del `.nsi` punto por punto:
- `MUI_LANGUAGE "Spanish"` ✓ (Spanish.nlf/nsh presentes; 1 language table en el log).
- `RequestExecutionLevel user` ✓ (línea 20).
- `InstallDir "$LOCALAPPDATA\Programs\FusionadorDeAudio"` ✓ + `InstallDirRegKey HKCU` ✓.
- Desinstalador HKCU COMPLETO ✓: DisplayName, DisplayVersion, Publisher, DisplayIcon,
  UninstallString, NoModify, NoRepair, InstallLocation, clave `Software\FusionadorDeAudio`;
  la sección Uninstall borra exe + LICENSE.txt + LEEME.txt + Desinstalar.exe + atajos
  (escritorio, menú Inicio, LÉEME) + ambas claves de registro.
- `VIAddVersionKey` (ProductName/FileDescription/FileVersion/ProductVersion/LegalCopyright)
  + `VIProductVersion "1.0.0.0"` ✓.
- `Unicode true`, `SetCompressor /SOLID lzma`, MUI2 con páginas licencia/componentes/
  directorio/instfiles/finish (texto de finish en castellano con aviso de formatos y
  privacidad), abort-warning en castellano ✓.
- `licencia.txt` == `LICENSE` (cmp ✓) — la página de licencia muestra la MIT real.

**El instalador compila limpio, es reproducible y el entregado es exactamente este.**

---

## 6. DECISIONES D-01..D-15

Leídas UNA A UNA (`docs/decisions/D-01…D-15-*.md`): **15/15** ficheros, cada uno con
secciones «Problema que resuelve», «Decisión», «Coste introducido» y «Alternativas
descartadas» — el formato del proyecto se mantiene. Verificaciones de contenido propias:
- D-04: licencias verificadas por mí en el module cache: go-mp3 **Apache-2.0**,
  oggvorbis **MIT**, flac **Unlicense** ✓ (claims ciertos).
- D-10: `icon.ico` regenerado por mí con `go run ./tools/genicon` → **byte-idéntico**
  (determinista); ICO con 6 imágenes 16/32/48/64/128/256 bpp32, PNG en ≥64 ✓.
- D-03: skip solo si falta ffmpeg, declarado ✓ (no ocurrió).
- D-15: recursos embebidos verificados en el binario (§2b). El paso goversioninfo@latest
  NO pude re-ejecutarlo (no está en el module cache con GOPROXY=off; el autor debió de
  tener red) — pero el `.syso` resultante está verificado dentro del exe final via rebuild
  byte-idéntico, que es lo que importa. (Declarado.)
- D-12: **parcialmente inflada** (5 literales fuera de es.go, ver §3c) — único defecto de
  honestidad encontrado en las decisiones.
- D-05/D-06/D-07/D-08/D-09/D-11/D-13/D-14/D-01/D-02: coherentes con lo verificado en §3/§5.

---

## 7. HONESTIDAD DEL README

Afirmaciones «Verificado aquí (Linux)» del README, contrastadas UNA A UNA por mí:

| Afirmación | Mi verificación | |
|---|---|---|
| 25/25 tests del motor con fixtures ffmpeg y salidas validadas con ffprobe | 25 RUN / 25 PASS / 0 SKIP; tests usan ffmpeg/ffprobe reales | ✓ CIERTO |
| Compilación cruzada PE32+ x64 GUI (9 secciones) | `file`: PE32+ GUI x86-64, 9 secciones; rebuild byte-idéntico | ✓ CIERTO |
| Recursos embebidos (manifest, icono, versión) | strings verificadas en el binario | ✓ CIERTO |
| Compilación del instalador NSIS 3.11 (PE Nullsoft, 7 secciones) | `file`: Nullsoft, 7 secciones; makensis v3.11-1 exit 0 sin warnings; rebuild byte-idéntico | ✓ CIERTO |
| «ÚNICAMENTE la herramienta» / sin toolbars/servicios/telemetría | .nsi leído completo + rebuild byte-idéntico + grep de red = 0 | ✓ CIERTO |
| Instalación por usuario, sin UAC, atajos, desinstalador HKCU | .nsi verificado | ✓ CIERTO |
| ~2,6 MB exe | 2.628.608 B = 2,63 MB decimal | ✓ CIERTO |
| Límites 500/512 MB/2 GB | `config/defaults.go`: MaxPistas 500, 512«20, 2«30 | ✓ CIERTO |
| M4A no admitido con error que lo explica | x.m4a → UNSUPPORTED_FORMAT con plantilla castellana (test + mi sonda) | ✓ CIERTO |
| «NO verificado aquí: ejecución real de la GUI y del instalador» + repro VM | honesto — coincido: yo tampoco pude | ✓ HONESTO |

Única desviación de honestidad detectada (menor): la centralización i18n «TODOS los textos
… en internal/i18n/es.go» (README §Estructura + D-12) es ~92% cierta — 5 literales de UI
viven en el gui (todos en castellano; §3c). Nada más inflado. El README no afirma NADA que
yo no haya podido reproducir.

---

## 8. WORKLOG (Task 15 del autor)

El worklog (`/home/z/my-project/worklog.md`, 2.437 líneas) TERMINA con la sección
«Task ID: 14 — árbitro final adversarial (LISTÓN, re-auditoría — Ronda 2)» del proyecto web.
**El autor de la app nativa TODAVÍA NO ha apendado su sección Task 15 al final.** No es
bloqueante (la escribirá después de mí, según lo acordado), pero se reporta.
AVISO de numeración: ya existe un «Task ID: 15» EN MEDIO del worklog (línea 252: «FASE 6 —
cierre» del proyecto WEB). Si el autor apenda otro «Task ID: 15» habrá DOS secciones con el
mismo ID — recomiendo distinguirlo (p. ej. «Task ID: 15 (app nativa)») para mantener el
rastro auditable.

---

## 9. EXTRA ADVERSARIAL — FUSIONES MANUALES PARA ROMPER EL MOTOR

Fixtures generados por mí con ffmpeg 7.1.5 (`/tmp/arb-audio/`): WAV 8-bit mono 8000 Hz
(1,2 s), WAV float32 384000 Hz estéreo (0,8 s, con chunk `fact`), MP3 mono 22050 Hz 64k
(1,097 s), WAV extensible 5.1 (fmt 0xFFFE + GUID PCM + LIST), WAV con LIST/INFO, MP3 con
ID3v1, MP3s CBR 96k, truncados a 200/3000/5700 bytes, WAV 0 bytes, MP3 2 bytes, OGG, FLAC.
Sonda compilada vía `go build -overlay` (paquete virtual `cmd/probearb` — CERO bytes
escritos en el proyecto) y ejecutada en Linux (el motor es portable, D-03):

```
== SONDEOS ==
raro1.wav   => wav 8000Hz 1ch 1.200s      raro2.wav  => wav 384000Hz 2ch 0.800s
raro3.mp3   => mp3 22050Hz 1ch 1.097s     ext5.wav   => wav 44100Hz 6ch 0.900s
id3v1.mp3   => mp3 44100Hz 1ch 0.758s     trunc.mp3  => mp3 44100Hz 1ch 0.496s
cero.wav    => ERROR UNSUPPORTED_FORMAT: archivo vacío
dos.mp3     => ERROR UNSUPPORTED_FORMAT: archivo vacío   (2 bytes: «vacío» — matiz de texto)

== FUSIONES ==
CASO raros->wav          => OK 12ms  fusion_raros.wav (49.600 B)
CASO ext5+mp3+lista->wav => OK 9ms   fusion_ext.wav (1.321.544 B)
CASO copia mp3 (Xing)    => OK       fusion_copia.mp3 (14.106 B)
CASO copia mp3 (ID3v1)   => ERROR DECODE_FAILED: frame MP3 inválido en id3v1.mp3 (byte 9090)   ← DEFECTO D2
CASO trunc->wav          => OK (corte en frontera de frame + 1 B: de facto válido)
CASO trunc primero->wav  => OK (ídem)
CASO cero.wav            => ERROR UNSUPPORTED_FORMAT
CASO dos.mp3             => ERROR UNSUPPORTED_FORMAT
CASO una pista           => ERROR NO_TRACKS: Añade al menos 2 pistas antes de fusionar.
CASO formato x           => ERROR INVALID_OPTIONS: formato de salida desconocido: "ogg"
CASO copia heterogénea   => ERROR PARAM_MISMATCH: «base.mp3» va a 44100 Hz · 1 canales y
                            «raro3.mp3» a 22050 Hz · 1 canales…
CASO float384 primero    => OK 24ms   fusion_f384.wav (4.757.260 B)
CASO trunc mid-frame/mini/3k (WAV y copia) => ERROR DECODE_FAILED «MP3 truncado… byte N» (exacto)
CASO id3v1->wav          => OK (el tag final NO molesta en salida WAV)
CASO ogg+flac+wav        => OK
CASO dir. salida inexistente => ERROR WRITE_FAILED: No se pudo escribir «…»: no se pudo
                            crear el archivo temporal (…)
```

Validación de las salidas con ffprobe (duración esperada = suma de duraciones sonda):

| Salida | ffprobe | Esperado | Error |
|---|---|---|---|
| fusion_raros.wav | pcm_s16le 8000 Hz 1ch **3,097250 s** | 3,097 | 0,008 % |
| fusion_ext.wav | pcm_s16le 44100 Hz 6ch **2,497166 s** | 2,497 | 0,007 % |
| fusion_copia.mp3 | mp3 44100 Hz 1ch **1,1755 s** (45 frames × 1152/44100) | 45 frames reales (Info de cada entrada descartado) | exacto |
| fusion_f384.wav | pcm_s16le 384000 Hz 2ch **3,097146 s** | 3,097 | 0,005 % |
| fusion_trunc.wav | 8000 Hz 1ch **1,696375 s** | 1,696 | exacto |
| f_id3v1w.wav / f_22k.wav / f_of.wav | 1,4106 / 2,2972 / 3,3000 s | 1,411 / 2,297 / 3,300 | exactos |

Decodificación completa de todas las salidas (`ffmpeg -f null`): **0 errores**. Salida del
modo copia inspeccionada byte a byte: empieza DIRECTAMENTE con frame de audio (ff fb …),
**sin** ID3v2, **sin** frame Info/Xing, **sin** ID3v1 final; las firmas «Info»/«Xing»/
«VBRI» NO aparecen en ninguna parte del archivo de salida (el «LAME» residual a byte 2289
es el identificador del encoder dentro del ancillary data de un frame de audio normal, sin
efecto).

**El motor SOBREVIVE todos los ataques con errores limpios, tipados y en castellano,
o produce salidas con duración EXACTA.** Los dos únicos defectos son D1/D2 (§3a-bis).

---

## 10. INVENTARIO DE DEFECTOS

**BLOQUEANTES: NINGUNO.**

**NO BLOQUEANTES (ordenados por prioridad):**

1. **D1 — WAV truncado se fusiona EN SILENCIO más corto** (decode.go:85-90; repro §3a-bis;
   fix ~4 líneas: propagar DECODE_FAILED «datos WAV truncados» en `decWav.Leer`). Requiere
   un input corrupto; la salida sigue siendo audio válido; la lista de la GUI mostraría la
   duración declarada (inconsistencia silenciosa).
2. **D2 — MP3 con ID3v1 final falla en modo copia con error engañoso** (merge.go:365-369;
   repro §9; fix: tolerar cola ≤ 4096 B como hace `EscanerMP3`). Caso real (MP3s de la era
   2000 con v1+v2), fallo LIMPIO, WAV sigue funcionando para los mismos archivos.
3. **5 literales de UI fuera de `internal/i18n/es.go`** (§3c) — castellano correcto, pero
   D-12/README queda inflada; además 4 claves i18n muertas que delatan la intención
   original.
4. Nits de higiene de repo (NO afectan al entregable): 4 `.syso` huérfanos en la raíz
   (386/arm/arm64/amd64, ~200 KB, no se enlazan en ningún build — el válido es
   `cmd/audio-merger/resource_windows_amd64.syso`); fixtures binarios sueltos en
   `internal/audio/` (a.mp3, s1.wav… ~500 KB, no referenciados por los tests, que usan un
   temp dir); constantes muertas en config (`PrecisionDuracionMS`, `ExtensionesAceptadas`,
   `NombreProducto`); `filepath.Base(err.Error())` en merge.go:116 (cosmético, ruta
   casi-inalcanzable); «archivo vacío» para un fichero de 2 bytes (matiz de texto);
   `ExtesionInvalida` mal escrito (nombre, no visible); govet app.go:206 (patrón estándar);
   fmt extensible con tam>40 sin salto de sobrante (no estándar, error limpio).

**NO VERIFICADO por este árbitro (declarado, con repro):**
- Ejecución REAL de la GUI Win32 y del instalador/desinstalador en Windows (sin Windows
  aquí). Repro: §4 (VM Windows 10/11 x64: instalar → 2 MP3 → Fusionar → ffprobe del
  resultado → atajos → desinstalar). Compilado para windows/amd64 y auditoría estática
  completa en su lugar.
- Re-ejecución del paso `goversioninfo@latest` (sin red/module cache): sus artefactos están
  verificados DENTRO del exe final vía rebuild byte-idéntico.
- Comportamiento del instalador en Windows 32-bit (irrelevante para el pedido x64).

---

## VEREDICTO

**ENTREGABLE: APROBADO ✅**

El listón literal del usuario queda verificado en verde por ejecución propia: (a) existe un
instalador NSIS real de 1.074.694 B en `download/`, byte-idéntico al compilado por el
árbitro desde el `.nsi` actual, sin avisos ni errores; (b) el programa es un binario nativo
PE32+ x86-64 GUI en Go puro CGO_ENABLED=0, reproducido byte a byte por el árbitro, con
manifest/icono/versión embebidos y cero código de red; (c) instala ÚNICAMENTE la herramienta
(exe + LEEME + LICENSE, verificado por contenido del .nsi + rebuild idéntico); (d) el
programa instalado es x64 (el stub i386 del instalador es la norma NSIS y no afecta). El
motor pasó 25/25 tests reales y mi batería adversarial (8-bit/8 kHz, float32/384 kHz,
extensible 5.1, LIST/fact, MP3 mono 22050, Xing real descartado, truncados con byte exacto,
0 y 2 bytes, heterogéneos) con duraciones de salida exactas y errores limpios, tipados y en
castellano. Los defectos hallados (D1 WAV-truncado silencioso, D2 ID3v1 en copia, 5
literales fuera de i18n, higiene de repo) son NO bloqueantes, están reproducidos arriba y
deben abordarse en la siguiente pasada del autor junto con la ejecución real en Windows que
aquí se declara no verificada. El worklog del autor (Task 15) aún no está apendado — se
espera tras este informe; que distinga su ID del «Task ID: 15» histórico de la web.
