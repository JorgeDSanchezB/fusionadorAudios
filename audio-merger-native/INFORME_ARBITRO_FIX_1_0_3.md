# INFORME DEL ÁRBITRO ADVERSARIAL — Bugfix 1.0.3 «correcciones tras auditoría 1.0.2» (Task ID: 23)

Proyecto: Fusionador de Audio — nativo Windows x64 (`audio-merger-native/`). Árbitro:
subagente independiente (mismo estándar que Tasks 16/19/21). Regla: NO se confía ni en el
autor (Task 22) ni en el árbitro anterior (Task 21); TODO se verifica por ejecución o
lectura propia. Entorno: Linux Debian, **SIN Windows real** (declarado en §6). Toolchain
verificado: go1.27.3 linux/amd64, makensis v3.11-1 (NSISDIR de toolchain), ffmpeg/ffprobe
7.1.5-0+deb13u1.

Cero bytes del repo modificados por este árbitro (salvo este informe y la sección apendada
al `worklog.md`); sondas y compilaciones a `/tmp`.

---

## 1. FIX POR DIFF (el delta 1.0.3 ES exactamente el declarado)

`git status --short`: cambios acumulados 1.0.2+1.0.3 sobre HEAD=a5d4e9e (1.0.1); los
instaladores 1.0.1 de `installer/` y `download/` siguen borrados. **Motor intacto**:
`git diff HEAD -- internal/audio/` = **0 líneas** (claim CIERTA).

El delta 1.0.3 se aísla por mtime (03:02–03:05) frente a la 1.0.2 (02:2x, descrita por el
informe Task 21) y coincide 1:1 con lo declarado; `app.go`, `es.go`, `main.go`,
`instalador-leeme.txt` y `arrastrar.go`-estructura-general NO se tocan en 1.0.3:

- `win32.go`: `LVM_GETITEMRECT +15→+14` (H2) ✓; `LVINSERTMARK` ahora
  `{CbSize,DwFlags,IItem,DwReserved}` 16 B canónica (H3) ✓; nueva `LVIM_AFTER=0x1` ✓;
  **eliminada** `LVM_GETITEMCOUNT` (H5; ausente del fichero, verificado por grep) ✓;
  `LVM_GETSELECTEDCOUNT` **QUEDA en +50 SIN CAMBIO** (H1 refutada, §2) ✓; comentarios
  D-19 incl. «+78 era LVM_GETTOOLTIPS» ✓.
- `arrastrar.go`: `marcaPara` usa `DwFlags`/`LVIM_AFTER`; `ponerMarca` (ÚNICO punto de
  envío de `LVM_SETINSERTMARK`, verificado por grep) rellena `CbSize=unsafe.Sizeof(...)` y
  `DwReserved=0` antes de enviar ✓.
- Guards H4 (`if a.fusionando || a.arrastrando { return }`) verificados por grep: 7 sitios
  — `anadirArchivos` (dialogos.go:25), `quitarSeleccion` (:248), `moverSeleccion` (:271),
  `vaciar` (:314), `iniciarFusion` (tarea.go:24), `menuContextual` (controles.go:178) y el
  preexistente `iniciarArrastre` (arrastrar.go:22). Los 6 declarados + el preexistente ✓.
- Versión 1.0.3 en `defaults.go:42`, `versioninfo.json` (Fixed 1,0,3,0 + Strings ×2),
  `app.manifest:3`, `nsi:11` (+OutFile/VI…); README con nota de release; D-19 nueva;
  D-17 corregida (matiz GETTOOLTIPS + nota de refutación de H1, leída entera) ✓.
- Rebuild real: ver §3 (exe e instalador reproducidos BYTE A BYTE).

## 2. DISPUTA H1 — RESUELTA FORMALMENTE: el AUTOR tiene razón, la H1 del árbitro 21 QUEDA REFUTADA

Cabecera descargada por ESTE árbitro (no la copia previa):
`curl -s https://raw.githubusercontent.com/wine-mirror/wine/master/include/commctrl.h`
→ 5.586 líneas, 191.510 B, md5 `b6ccf348b811d4416f4128c411837cf7` (idéntica a la copia
previa `/tmp/wine-commctrl.h`, descarga independiente reproducible). Grep mecánico propio:

```
l.3331: #define LVM_SETITEMCOUNT      (LVM_FIRST+47)
l.3332: #define LVM_SORTITEMS          (LVM_FIRST+48)
l.3334: #define LVM_SETITEMPOSITION32  (LVM_FIRST+49)
l.3335: #define LVM_GETSELECTEDCOUNT   (LVM_FIRST+50)   ← el valor del código es CORRECTO
l.3336: #define LVM_GETITEMSPACING     (LVM_FIRST+51)
```

La «reconstrucción» del árbitro 21 insertó GETSELECTEDCOUNT en el hueco +48, pero el
ocupante real de +48 es LVM_SORTITEMS. Su propia §9 lo advertía: no tenía commctrl.h ni
internet y sus valores eran «reconstrucción aritmética» con «confianza ~96 %» — la fuente
autoritativa la desmiente. Coincide además con el SDK real (conocimiento propio del
árbitro 23). **Consecuencia práctica**: aplicar la corrección exigida por el árbitro 21
(+50→+48) habría convertido `refrescarBotones` en un LVM_SORTITEMS(wParam=0, lParam=0) →
**habría ROTO los botones que funcionan**. El autor hizo bien en no tocarla y en exigir
evidencia de cabecera (D-19). **H1: REFUTADA con evidencia de fuente autoritativa.**

## 3. VERIFICACIONES PROPIAS (todas ejecutadas en /tmp)

**Constantes — contraste MECÁNICO código↔cabecera wine (cada valor usado):**
GETITEMRECT +14✓(l.3284) · HITTEST +18✓(3290) · SETITEMW +76✓(3271) · INSERTITEMW +77✓(3274)
· SETITEMSTATE +43✓(3323) · DELETEITEM +8✓(3276) · DELETEALLITEMS +9✓(3277) · INSERTCOLUMNW
+97✓(3306) · SETCOLUMNWIDTH +30✓(3310) · GETNEXTITEM +12✓(3280) · GETSELECTEDCOUNT +50✓(3335)
· GETSELECTIONMARK +66✓(3353, definida-sin-uso, inofensiva) · ENSUREVISIBLE +19✓(3291)
· SETEXTENDEDLISTVIEWSTYLE +54✓(3341) · SETINSERTMARK +166✓(3395) · LVIR_BOUNDS 0✓(3161)
· LVIM_AFTER 0x1✓(3259) · LVN_ITEMCHANGED −101✓(3422) · LVN_BEGINDRAG −109✓(3433)
· LVIF_TEXT 0x1✓ · LVIS_SELECTED 0x2✓ · LVIS_FOCUSED 0x1✓ · LVCF_TEXT 0x4✓ · LVCF_WIDTH
0x2✓ · LVNI_SELECTED 0x2✓ · LVCFMT_LEFT 0x0✓ · LVS_EX_FULLROWSELECT 0x20✓ ·
LVS_EX_DOUBLEBUFFER 0x10000✓ · LVM_FIRST 0x1000✓(3261). LVS_REPORT=0x1 y
LVS_SHOWSELALWAYS=0x8 no están en wine (son del SDK; valores estándar correctos por
conocimiento propio). WM_MOUSEMOVE=0x0200, WM_LBUTTONUP=0x0202, WM_CAPTURECHANGED=0x0215:
ausentes de commctrl.h (winuser.h), valores estándar correctos por conocimiento propio.

**ÚNICA discrepancia hallada (hallazgo propio H6, preexistente 1.0.0→, menor, NO
bloqueante):** `LVIF_STATE = 0x0002` (win32.go:140) — canónico **0x0008** (wine l.3153;
0x2 es LVIF_IMAGE). Solo se usa en los 2 envíos de `LVM_SETITEMSTATE`
(controles.go:300/307), mensaje que **ignora el campo Mask** — evidencia decisiva: el macro
canónico `ListView_SetItemState` (wine l.3980-82, idéntico al del SDK) solo fija
state/stateMask y deja Mask SIN inicializar, y funciona en Windows real. Impacto funcional:
**CERO**. Recomendación (higiene, próxima release): 0x0002→0x0008.

**H2/H3/H4/H5 en 1.0.3:** H2 CONFIRMADA por cabecera (l.3284 +14; l.3285 confirma que +15
era LVM_SETITEMPOSITION) y APLICADA ✓. H3 CONFIRMADA en su diagnóstico (sin CbSize,
SETINSERTMARK devuelve FALSE) y APLICADA con la struct REAL: wine l.3837-3843
`{UINT cbSize; DWORD dwFlags; int iItem; DWORD dwReserved}` — la «canónica» de 12 B/3 campos
del árbitro 21 también queda refutada por la cabecera; el autor implementó MÁS de lo exigido
✓. H4 CONFIRMADA y APLICADA (7 guards; todos los caminos WM_COMMAND/aceleradores/menú
contextual desembocan en funciones guardadas — verificado leyendo app.go:166-216 y
controles.go:177-202) ✓. H5 APLICADA (LVM_GETITEMCOUNT fuera) ✓.

**Structs (sonda propia en /tmp, copia literal + aserciones en compilación x64):** COMPILA
OK ⇒ RECT=16; LVHITTESTINFO=24 (Flags@8, IItem@12; campo a campo = wine l.3718-3726);
**LVINSERTMARK=16 (CbSize@0, DwFlags@4, IItem@8, DwReserved@12)**; LVITEMW=72 (PszText@24,
LParam@40); LVCOLUMNW=40.

**Tests del motor:** `go test ./internal/audio/ -count=1 -v` → EXIT=0, `ok 1.966s`;
**RUN=27 / PASS=27 / FAIL=0 / SKIP=0** ✓.

**go vet (GOOS=windows GOARCH=amd64):** EXIT=1 con **exactamente 2 avisos**:
`app.go:220:32` y `app.go:227:55` (los 2 casts lParam→NMHDR/NMLISTVIEW de WM_NOTIFY; leídos
en fuente: son exactamente esas líneas) ✓.

**Rebuild del exe (flags exactas de build.sh):**
`go build -trimpath -ldflags "-s -w -H windowsgui" -o /tmp/arb1303.exe ./cmd/audio-merger`
→ BUILD OK; md5 `690b75a96b839c84c3b6da572848639a` = dist/ = declarado; `cmp` →
**BYTE-IDÉNTICO** (2.636.288 B, PE32+ x64 GUI, 9 secciones) ✓.

**Reproducción del instalador (copia `cp -p` a /tmp, makensis v3.11-1 + NSISDIR):** EXIT=0;
`licencia.txt` = `LICENSE` (regenerada por build.sh, cmp OK); md5
`a90f7ecf4885221c8faa4e98f8fb03f2` = installer/ = download/ = declarado; `cmp` →
**BYTE-IDÉNTICO** (1.077.006 B, Nullsoft SFX, 7 secciones) ✓. Cadena temporal coherente:
icono 03:05:11.7 → .syso 03:05:12.0 → dist 03:05:12.4 → instalador 03:05:13.5 → download
03:05:13.5.

**Cadena de versión 1.0.3:** defaults.go:42, versioninfo.json (Fixed 1,0,3,0 + Strings
«1.0.3.0» ×2), app.manifest:3, nsi:11 ✓. `strings -e l`: «1.0.3.0» **×2 en el exe, ×2 en
el instalador, ×2 en el .syso; 0 restos de «1.0.2.0»/«1.0.1.0»** en ambos PE ✓.
`installer/` y `download/` contienen SOLO el instalador 1.0.3 ✓ (los 1.0.2 de la release
anterior ya no existen; los borrados en git-status son los 1.0.1).

## 4. HONESTIDAD: claims del autor (Task 22) vs. realidad medida

| Afirmación | Realidad medida | Veredicto |
|---|---|---|
| md5 exe = 690b75a9…848639a | idéntico en mi rebuild (byte a byte) | ✓ CIERTO |
| md5 instalador = a90f7ecf…8fb03f2 = download/ | idéntico en installer/, download/ y mi rebuild | ✓ CIERTO |
| «1.0.3.0» ×2 UTF-16 en exe e instalador; 0 «1.0.2.0» | ×2 y ×2; 0 y 0 (también ×2 en .syso) | ✓ CIERTO |
| go vet windows: exactamente 2 avisos (220:32, 227:55) | exactamente esos 2, líneas y columnas | ✓ CIERTO |
| Tests motor ok, 0 diff en internal/audio | 0 líneas; 27/27/0/0 | ✓ CIERTO |
| Delta 1.0.3 = lo declarado (1-5) | coincide 1:1 (diff + mtime + lectura) | ✓ CIERTO |
| H1 refutada con cabecera real wine | confirmado con MI PROPIA descarga (§2) | ✓ CIERTO |
| LVINSERTMARK canónica 16 B/4 campos | wine l.3837-43 + aserción de compilación | ✓ CIERTO |
| Guards en 6 funciones | 6 declarados + preexistente en iniciarArrastre | ✓ CIERTO |

Inflado: NINGUNO. Defectos nuevos en 1.0.3: NINGUNO. Notas: (a) el worklog **NO tiene
sección «Task ID: 22»** (patrón ya visto con la Task 20; los claims vinieron en el
encargo); (b) `soltarArchivos` (WM_DROPFILES) solo guarda `fusionando`, no `arrastrando`
— hueco teóricamente inalcanzable (un drop externo exige soltar el botón en el Explorador
mientras el interno lo retiene el capture); sin impacto; (c) H6 (LVIF_STATE=0x2,
preexistente, impacto cero, §3).

## 5. REPRO PARA EL USUARIO (VM Windows 10/11 x64)

1. Instalar 1.0.3 → añadir 3 MP3: nombre/formato/duración/info visibles, última pista
   resaltada y con foco.
2. Botones «Quitar/Subir/Bajar» se habilitan con selección manual (H1 refutada: +50
   correcto — si se vieran grises, avisar; sería contradicción con la cabecera).
3. Arrastrar una pista: DEBE verse la marca de inserción bajo el cursor (H3 corregida:
   CbSize 16 B) y el «después de la fila» debe responder a la mitad inferior (H2: +14).
4. Durante un arrastre, pulsar Alt+↓ o Supr: no debe ocurrir nada (H4 guards).
5. Bloques de 2-3 filas con Alt+↑/↓: se mueven como unidad un hueco. Fusionar a WAV/MP3 y
   auditar que el orden de salida es el de la lista (ffprobe/reproductor).
6. Cancelar fusión a mitad; arrastrar fuera de la lista (cancela); desinstalar sin rastro.

## 6. LO QUE NO SE PUDO VERIFICAR

- **Ejecución real de la GUI en Windows** (marca pintada, botones, arrastre, orden de
  fusión): entorno Linux sin Windows/wine. Todo §2-3 es estático + mecánica Win32; la
  diferencia decisiva con la auditoría 1.0.2 es que las constantes ya NO son
  reconstrucción: están contrastadas contra la cabecera real (wine, fuente autoritativa
  del ABI Win32, coherente con el SDK) — la incertidumbre de H1/H2/H3 (92-96 %) queda
  reducida a «¿funciona comctl32 v6 en la máquina del usuario?», verificable por la repro.
- Eficacia en la máquina concreta del usuario (versión de Windows, comctl32, shell del
  diálogo): fuera de alcance estático.

---

## VEREDICTO: **APROBADO** ✅

1. La disputa H1 se resuelve con evidencia de fuente autoritativa: `LVM_GETSELECTEDCOUNT =
   LVM_FIRST + 50` es CORRECTO (wine l.3335, rodeado de SORTITEMS +48 /
   SETITEMPOSITION32 +49 / GETITEMSPACING +51); la exigencia del árbitro 21 (+48) habría
   roto los botones. La refutación del autor es procedimentalmente impecable: no se
   limitó a discutir, descargó la cabecera real y contrastó mecánicamente.
2. H2, H3, H4 y H5 están confirmadas y correctamente aplicadas; la struct implementada es
   la REAL de 16 B (más completa que la «canónica» de 12 B que pedía el árbitro 21).
3. Logística impecable y sin inflado: motor intacto (0 líneas, 27/27), vet con exactamente
   los 2 avisos declarados, exe e instalador reproducidos byte a byte por este árbitro,
   cadena de versión completa (4 fuentes + strings ×2/×2, cero restos), instaladores viejos
   fuera, delta 1.0.3 = lo declarado.
4. Hallazgos propios NO bloqueantes, para la próxima release (higiene): LVIF_STATE 0x2→0x8
   (impacto cero, uso en LVM_SETITEMSTATE que ignora Mask); guard `arrastrando` en
   `soltarArchivos` (hueco teórico); añadir la sección «Task ID: 22» al worklog.
5. La 1.0.3 cierra el ciclo de la auditoría como debe: la fuente de verdad pasó de tablas
   de memoria a la cabecera real. Solo queda la verificación runtime del usuario (§5).

— Árbitro adversarial independiente, Task ID: 23.
