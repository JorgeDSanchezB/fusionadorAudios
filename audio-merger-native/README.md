# Fusionador de Audio — nativo para Windows x64

Programa **nativo** (un único `.exe`, sin runtimes ni navegadores embebidos) que
une varios audios en uno solo, en el orden que el usuario elija. Compañero de
escritorio de la librería web `<audio-merger>` del mismo proyecto.

```
download/FusionadorDeAudio-Setup-1.0.3-x64.exe   ← instalador (NSIS, español)
```

> **1.0.3** completa el fix de la 1.0.2 tras auditoría adversarial: contrasta
> TODAS las constantes Win32 contra la cabecera REAL commctrl.h (wine) — lo que
> corrigió `LVM_GETITEMRECT` (+14, no +15) y dio a `LVINSERTMARK` su campo
> `CbSize` obligatorio (sin él la marca de inserción del arrastre jamás se
> pintaba), añadió guards anti-reentrada durante el arrastre y REFUTÓ con
> evidencia la claim del árbitro de que `LVM_GETSELECTEDCOUNT` debía ser +48
> (la cabecera real confirma +50: los botones Quitar/Subir/Bajar funcionan).
> Ver D-19.
>
> **1.0.2** corregía dos bugs reales de la 1.0.1 reportados por el usuario: la
> lista no mostraba nombre/formato/duración al cargar («no veo que cargó») y no
> se podía elegir el orden (la selección programática nunca funcionaba y la
> fusión salía en el orden alfabético del diálogo). Causa raíz: dos constantes
> LVM mal transcritas (D-17). Además añade reordenación por **arrastre dentro
> de la lista** (D-18) y resalta la última pista añadida como confirmación.
>
> **1.0.1** corregía un cuelgue real de la 1.0.0 en Windows (ventana congelada
> al usar el diálogo de archivos; D-16, falta de `runtime.LockOSThread`).

## Qué contiene el instalador

ÚNICAMENTE la herramienta:

- `FusionadorDeAudio.exe` — binario único Go puro (`CGO_ENABLED=0`), ~2,6 MB,
  con icono, manifiesto (comctl32 v6, DPI-aware, UTF-8) y VERSIONINFO.
- `LEEME.txt` y `LICENSE.txt` — documentación mínima de la herramienta.

Instalación **por usuario** en `%LOCALAPPDATA%\Programs\FusionadorDeAudio`
(sin UAC), atajos en el menú Inicio (escritorio opcional) y desinstalador
completo (registro HKCU). Nada más: sin toolbars, sin servicios, sin
telemetría. Todo el audio se procesa en el equipo del usuario.

## Capacidades

| | |
|---|---|
| Entradas | WAV (PCM 8/16/24/32 bits, IEEE float 32, incl. extensible), MP3, OGG/Vorbis, FLAC |
| Salidas | WAV (PCM 16 bits, siempre) · MP3 en **modo copia** (concatenación de frames; requiere entradas MP3 homogéneas) |
| Límites | 500 pistas · 512 MB por archivo · 2 GB de entrada total |
| UI | Castellano, Win32 nativa: lista con nombre/formato/duración/info, reordenar con Subir/Bajar (Alt+↑/↓) o arrastrando dentro de la lista, menú contextual, arrastre de archivos desde el Explorador, barra de progreso, cancelación |
| Privacidad | Sin red: cero conexiones |

No se admiten M4A/AAC (D-14): el error `UNSUPPORTED_FORMAT` lo explica y
sugiere conversión previa.

## Estructura

```
cmd/audio-merger/     entry (GUI Win32)
internal/audio/       motor portable: sonda, decodificadores, fusión  ← testeado en Linux
internal/config/      límites y constantes (única fuente de verdad)
internal/i18n/es.go   TODOS los textos de la GUI en castellano
internal/gui/         Win32 por syscalls (user32/comdlg32/comctl32)
tools/genicon         icono generado programáticamente
resources/            manifest, versioninfo, icono
installer/            script NSIS
docs/decisions/       D-01…D-19 (problema/coste/alternativa)
```

## Compilar y verificar (desde Linux)

Requisitos: Go ≥ 1.27, NSIS 3.11 (extraíble de los .deb de Debian sin root,
véase `build.sh`), ffmpeg/ffprobe para los tests.

```
./build.sh
```

Ejecuta: tests del motor con fixtures reales → icono → recursos PE → exe →
instalador → copia a `../download/`.

```
go test ./internal/audio/ -count=1 -v     # 27 tests con ffmpeg/ffprobe reales
```

## Estado de verificación (honestidad)

**Verificado aquí (Linux):** 27/27 tests del motor (25 + 2 regresiones D1/D2 del árbitro) con fixtures ffmpeg y
salidas validadas con ffprobe/decodificación real; compilación cruzada
PE32+ x64 GUI (9 secciones, recursos embebidos: manifest, icono, versión);
compilación del instalador NSIS 3.11 (PE Nullsoft, 7 secciones).

**NO verificado aquí (sin Windows):** ejecución real de la GUI y del
instalador. La 1.0.0 se congelaba al cargar audio (D-16); la 1.0.1 corrigió
eso pero dejó la lista sin contenido visible ni selección programática
(D-17, reporte de usuario); la 1.0.2 corrigió ambas constantes y añadió
arrastre interno (D-18); la 1.0.3 completó el fix tras auditoría adversarial
contrastando todas las constantes contra la cabecera real commctrl.h (D-19).
La ejecución en Windows real sigue sin ser posible aquí. Repro sugerida: VM
Windows 10/11 x64 → instalar → añadir 2–3 audios (deben verse nombre,
formato y duración, y quedar resaltada la última) → reordenar arrastrando y
con botones → fusionar → comprobar que el orden de la salida es el de la
lista. El motor que produce la salida ES el mismo paquete probado con 27/27.
