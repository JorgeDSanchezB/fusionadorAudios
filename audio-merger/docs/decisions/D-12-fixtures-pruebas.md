# D-12 — Fixtures reales reproducibles + pruebas del motor en navegador

- **Problema:** el listón exige tests del core de unión con ≥5 fixtures de formatos y
  tamaños distintos Y honestidad epistémica: ffmpeg.wasm 0.12 solo funciona en
  navegador (Worker clásico + importScripts); Node no puede ejecutarlo de forma fiel.
- **Decisión:** dos capas de prueba, cada una honesta sobre lo que cubre:
  1. **Vitest/Node** para TODO lo puro: reducer, validación, estrategias, estimación,
     registro/extensión, parser de sonda (con líneas REALES capturadas de ffmpeg 7.1.5
     sobre los fixtures) y orquestación con motor SIMULADO (etiquetado como tal en la
     cabecera del test).
  2. **Navegador real** (página `selftest` servida por la demo, automatizable con
     agent-browser) para el motor real con los fixtures reales: MP3+MP3 (copia),
     WAV+MP3 (re-codificación), M4A+MP3, FLAC+MP3→WAV, OGG, OPUS registrado como
     extensión, archivo corrupto → CORRUPT_FILE, y validación de duración de salida.
- **Coste:** la batería de navegador no corre en `vitest` (hay que abrir la página);
  se documenta el comando exacto y el resultado real se pega en el informe.
- **Alternativa descartada:** simular ffmpeg.wasm en Node con jsdom/mocks y presentarlo
  como “tests del motor” — exactamente el tipo de deshonestidad que el listón veta.

# Fixtures (tests/fixtures/generate.sh, reproducible)

| Archivo | Contenido | Papel |
|---|---|---|
| tono-440-est.mp3 | 3,03 s · mp3 · 44100 · estéreo · 128 k | caso base de copia |
| tono-880-mono.mp3 | 2,06 s · mp3 · 22050 · mono · 64 k | parámetros distintos → re-codificación |
| voz-sim.wav | 2,00 s · pcm_s16le · 44100 · estéreo | entrada WAV |
| tono-660.m4a | 2,00 s · aac LC · 44100 · estéreo · 95 k | AAC (siempre re-codifica) |
| ruido.oga | 2,00 s · vorbis · 44100 · estéreo | OGG |
| tono-220.flac | 3,00 s · flac · 44100 · estéreo | FLAC |
| tono-550.opus | 2,01 s · opus · 48000 · estéreo | formato EXTENDIDO (se registra por API en el test) |
| roto.mp3 | 4.097 B no válidos | corrupto → CORRUPT_FILE |
