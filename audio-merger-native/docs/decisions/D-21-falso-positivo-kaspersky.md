# D-21 — Veredicto heurístico de Kaspersky «VHO:Trojan.Win64.Convagent.gen» (falso positivo)

## Problema que resuelve
El usuario descomprime el portable 1.0.3 en su escritorio (OneDrive) y
Kaspersky (File Anti-Virus, disparado por SearchProtocolHost.exe al indexar
la carpeta nueva) **borra** `FusionadorDeAudio.exe` con veredicto
`VHO:Trojan.Win64.Convagent.gen`, «Precisión: Análisis heurístico». Pregunta
literal del usuario: «¿me estás poniendo virus?».

## Evidencia de que el binario es exactamente el compilado aquí (y limpio)
1. **MD5 byte a byte**: el reporte de Kaspersky cita
   `AD0B94B14B1713FE2FD64EC189398FE4` para el exe borrado;
   `md5sum dist/FusionadorDeAudio.exe` y el exe dentro del ZIP de
   `download/` dan **exactamente** ese hash. Nadie modificó el archivo en
   el trayecto (el MD5 del propio reporte lo demuestra).
2. **Auditoría de fuente** (4.472 líneas Go, todo el proyecto es legible):
   - `net/http|net.Dial|net.Listen|websocket|Download`: 0 coincidencias en
     código (solo el texto UI «nada se sube a internet» en `i18n/es.go`).
   - `os/exec|exec.Command`: 0 en código de producción (solo
     `motor_test.go`, que genera fixtures con ffmpeg; los `_test.go` nunca
     se compilan al binario).
   - `RegOpenKey|RegSetValue|registry`: 0.
   - Dependencias: go-mp3, oggvorbis, flac + stdlib de Go. Nada más.

## Causa raíz del veredicto (estructura, no contenido)
- `VHO:` = «Verdict based on Heuristic analysis» en la nomenclatura pública
  de Kaspersky: **no hay coincidencia de firma** con malware conocido; es
  una estimación por semejanza (`.gen` = familia genérica).
- Tres características estructurales lo disparan:
  a) **Sin firma digital** (sin certificado de firma de código).
  b) **Prevalencia cero**: hash recién compilado, la nube KSN no lo ha visto
     en ningún otro equipo.
  c) **GUI Win32 con resolución dinámica** (`syscall.NewLazyDLL` de
     user32/gdi32/comctl32/comdlg32/shell32, D-02): la tabla de importaciones
     del PE solo lista kernel32 y el resto se resuelve en ejecución — patrón
     que los heurísticos asocian a ocultamiento de APIs (típico de malware),
     aunque aquí es la forma canónica de llamar a Win32 desde Go puro sin
     CGO. Además el exe estaba compilado con `-s -w` (símbolos eliminados),
     que reduce aún más la legibilidad para el heurístico.

## Decisión
1. **Recompilar SIN `-s -w`** (conservar tabla de símbolos + DWARF):
   deja que el motor heurístico (que sabe parsear binarios Go) lea nombres
   de funciones y estructura estándar. Evidencia comunitaria consistente de
   que los binarios Go «stripped» reciben más falsos positivos. Coste:
   ~3,9 MB vs ~2,6 MB. `build.sh` actualizado.
2. README de `download/` reescrito: sección «¿me estás poniendo virus?» con
   la evidencia, pasos exactos de exclusión en Kaspersky (añadir la
   exclusión ANTES de volver a descomprimir; evitar carpetas OneDrive), y
   reporte del falso positivo en **opentip.kaspersky.com** (vía oficial:
   análisis manual y whitelist en futuras actualizaciones de firmas).
3. Se mantiene el resto de mitigaciones de D-20 (zlib en NSIS, portable ZIP).

## Límites (honestidad cognitiva)
- No hay Windows ni Kaspersky en este entorno: **no se puede reproducir el
  veredicto ni medir si la recompilación lo evita**. Es la palanca gratuita
  más plausible, no una garantía.
- La resolución dinámica de APIs no se puede eliminar sin CGO (complicaría
  el build cruzado y rompería D-03/D-08); es la causa estructural
  irremovible del parecido heurístico.
- La solución definitiva es firma de código (imposible aquí) o el whitelist
  de Kaspersky tras reporte en OpenTip (lado usuario, documentado).
- Cada hash nuevo vuelve a «prevalencia cero»: el nuevo binario parte otra
  vez sin reputación; se asume y se documenta.

## Alternativas descartadas
- Certificado autofirmado: no mejora reputación; añade avisos.
- UPX/empaquetado: aumenta detecciones.
- Abandonar el portable: el usuario lo prefiere tras el bloqueo doble.

## Verificación
Linux: tests del motor OK; `file` confirma PE32+ GUI; hashes nuevos
publicados en `download/README.md` (exe MD5
`49dfa5a89ceac5b2d4b0b39c111fb718`). Windows: el usuario debe añadir la
exclusión → descomprimir de nuevo → (recomendado) reportar en OpenTip.
