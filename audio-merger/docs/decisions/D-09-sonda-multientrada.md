# D-09 — Sonda multi-entrada en UNA ejecución ffmpeg

- **Problema:** decidir `-c copy` exige conocer códec/tasa/canales/duración de TODAS
  las pistas; ffprobe no existe en el core y sondear archivo a archivo multiplica las
  ejecuciones (y el riesgo de inestabilidad del core entre exec).
- **Decisión:** una sola ejecución `ffmpeg -hide_banner -i p1 -i p2 … -t 0.05 -f null -`:
  abre todas las entradas (bloques `Input #N` con `Duration` y `Stream … Audio:`),
  decodifica ≤50 ms de una y termina bien. El parser (engine/probe.ts) es puro y está
  testeado con líneas REALES de ffmpeg 7.1.5 sobre los fixtures (incluye formatos con
  comas — M4A — y códecs con perfil entre paréntesis).
- **Coste:** dependencia del formato textual del log de ffmpeg (estable entre 6.x/7.x;
  los tests lo detectarían si cambiara); la medición de duración usa una segunda
  pasada `-i salida` (solo cabeceras).
- **Alternativa descartada:** un exec de sonda POR archivo (N ejecuciones, N riesgos
  de dejar el core en estado sucio) o leer cabeceras a mano por formato (un parser por
  contenedor, frágil).
