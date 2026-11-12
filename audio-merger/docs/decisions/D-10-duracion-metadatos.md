# D-10 — Duración por metadatos de `<audio>` + sonda, sin decodificar

- **Problema:** mostrar duración por pista y estimar la salida ANTES de unir exige
  conocer duraciones sin pagar una decodificación completa (horas de podcast).
- **Decisión:** al añadir una pista, la UI lee su duración con un `<audio>` efímero
  (`loadedmetadata`: el demuxer del navegador parsea solo cabeceras). Si el navegador
  no la declara (FLAC sin SEEKTABLE, OGG de flujo), queda `null` y la UI enseña
  «duración desconocida». Durante la unión, la sonda ffmpeg (D-09) mide la duración
  real de cada entrada y la usa para la validación post-unión.
- **Coste:** dos fuentes de duración (navegador y sonda) con posible discrepancia
  menor (decenas de ms); la autoritativa es la sonda.
- **Alternativa descartada:** `AudioContext.decodeAudioData` — decodifica TODO el
  audio a PCM en RAM: O(duración) y bloquea; exactamente lo que evitamos.
