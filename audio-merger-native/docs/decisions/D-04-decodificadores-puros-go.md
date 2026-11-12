# D-04 — Decodificadores puros Go; NADA de ffmpeg embebido

## Problema que resuelve
«Únicamente la herramienta»: el instalador no debe llevar dentro otro programa.

## Decisión
Entradas soportadas mediante librerías Go puras (compiladas dentro del exe):
- WAV: lector RIFF/WAVE propio (PCM int 8/16/24/32 y float 32, incl. WAVE_FORMAT_EXTENSIBLE).
- MP3: github.com/hajimehoshi/go-mp3 v0.3.4 — licencia Apache-2.0 (VERIFICADA del
  module cache).
- OGG/Vorbis: github.com/jfreymuth/oggvorbis v1.0.5 — licencia MIT (VERIFICADA).
- FLAC: github.com/mewkiz/flac v1.0.14 — Unlicense/domínio público (VERIFICADA).

## Coste introducido
- Sin M4A/AAC (no existe decodificador AAC puro Go mantenida) → error tipado claro
  UNSUPPORTED_FORMAT con mensaje que explica formatos admitidos (véase D-14).
- Sin codificador MP3 (véase D-05).

## Alternativas descartadas
- **Bundling ffmpeg.exe**: ~80 MB de «otro programa» dentro del instalador, licencia
  GPL/LGPL y contradice «únicamente la herramienta».
