# D-03 — Motor de audio portable, testeado en Linux con fixtures reales

## Problema que resuelve
No se puede ejecutar Windows en este entorno, pero la corrección de la FUSIÓN de audio
debe verificarse de verdad (no declarada).

## Decisión
Todo el motor de audio vive en `internal/audio` con E/S de archivos y sin una sola
llamada Win32: el MISMO paquete se compila y ejecuta en Linux, donde se prueba con
`go test` usando fixtures generadas con ffmpeg CLI real y salidas validadas con ffprobe
(duración, códec, tasa, canales).

## Coste introducido
- Separación estricta motor/GUI (necesaria de todos modos por limpieza).
- Los tests dependen de ffmpeg/ffprobe presentes (en este entorno lo están; si faltan
  los tests lo declaran con skip explícito y mensaje).

## Alternativas descartadas
- «Compilar y rezar»: entrega sin verificación — inaceptable según el listón del
  proyecto.
