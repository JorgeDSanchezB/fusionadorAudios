# D-14 — M4A/AAC excluido del soporte (honestidad en el error)

## Problema que resuelve
La web aceptaba M4A (ffmpeg.wasm). El nativo puro-Go no tiene decodificador AAC fiable.

## Decisión
M4A/AAC (y cualquier otro formato) → UNSUPPORTED_FORMAT con mensaje que lista los
formatos admitidos y sugiere convertir previamente. El filtro de archivos del diálogo
solo ofrece wav/mp3/ogg/flac; el «arrastrar» cualquier cosa pasa por el sniffer de
magic bytes (la extensión no se fía de nada).

## Coste introducido
- Feature gap declarado respecto a la web (documentado en README e informe).

## Alternativas descartadas
- Decodificador AAC casero: cientos de horas de riesgo.
- Aceptar el archivo y fallar después: peor UX y deshonesto.
