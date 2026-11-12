# D-20 — Falsos positivos del antivirus contra el instalador (mitigación)

## Problema que resuelve
El usuario reporta que al ejecutar `FusionadorDeAudio-Setup-1.0.3-x64.exe`
Windows muestra «Windows no tiene acceso al dispositivo, ruta de acceso o
archivo especificado» y el archivo **desaparece solo**. Ese patrón (archivo
que se borra al ejecutarlo + ese MessageBox) es la firma de una **cuarentena
del antivirus** (Windows Defender o AV de terceros), no un defecto del
instalador: el AV borra el .exe en el momento de la ejecución y Windows
responde con ese error porque el archivo ya no existe.

Causa raíz: binario **sin firma digital** (no hay certificado de firma de
código, que cuesta dinero y no existe en este entorno) + envoltorio **NSIS
con compresión LZMA sólida** — combinación clásica de disparador de la
heurística ML de Defender («Trojan:Win32/Wacatac.B!ml» y similares) y de AV
de terceros contra instaladores de baja prevalencia.

## Decisión
1. **Instalador**: `SetCompressor /SOLID lzma` → `SetCompressor zlib`.
   La compresión sólida LZMA es el disparador de heurísticas más citado en
   instaladores NSIS sin firmar; zlib es la compresión estándar y histórica
   de NSIS, con menor tasa de falsos positivos. Coste: instalador mayor
   (~1,3 MB vs ~0,9 MB). El resto del guion no cambia.
2. **Portable ZIP** (`FusionadorDeAudio-Portable-1.0.3-x64.zip`): el
   ejecutable de la app es autónomo (Go puro, sin dependencias), así que se
   empaqueta exe + licencia + LÉEME en un ZIP que el usuario descomprime y
   ejecuta. **Evita el envoltorio NSIS por completo**, que era el vector del
   falso positivo. El exe «desnudo» con VERSIONINFO + icono + manifiesto
   asInvoker tiene históricamente mucha menos tasa de detección que el
   instalador. El LÉEME interno incluye los pasos para desbloquear si el AV
   marcara también el exe.
3. `build.sh` genera ambos artefactos en `download/`.

## Límites (honestidad cognitiva)
- **Sin Windows en este entorno**: no se puede reproducir la cuarentena ni
  medir la tasa de detección (p. ej. en VirusTotal). La evidencia de que
  zlib reduce falsos positivos es comunitaria/anecdótica, no verificada aquí.
- **La única solución definitiva** es firmar el binario y el instalador con
  un certificado de firma de código (OV/EV) — requiere compra y no es
  posible desde este entorno. Sin ella, ningún ajuste garantiza cero
  detecciones.
- Los pasos de «restaurar / permitir / excluir» en Defender son del lado
  del usuario y están documentados en `download/README.md` y en el
  LÉEME portable.

## Alternativas descartadas
- **Firmar con certificado autofirmado**: no cambia la reputación; Defender
  sigue marcando y añade avisos extra de editor desconocido.
- **UPX u otro empaquetado del exe**: aumentaría las detecciones.
- **MSSI/msiwrapper**: mismo problema de reputación sin firma.
- **Distribuir solo portable**: se mantiene también el instalador porque el
  usuario pidió explícitamente un instalador .exe nativo.

## Verificación
- Linux: tests del motor OK, `file` confirma PE32+ GUI (app) y NSIS
  self-extracting (instalador), ZIP con 3 archivos, hashes SHA-256
  publicados en `download/README.md`.
- Windows (lado usuario): ejecutar el instalador reconstruido; si el AV
  volviera a borrarlo, usar el portable ZIP y/o los pasos de restauración
  del historial de protección.
