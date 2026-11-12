# D-11 — Errores tipados con códigos estables

## Problema que resuelve
Mensajes de error consistentes y clasificables, igual que en la librería web.

## Decisión
`audio.Error{Codigo, Mensaje, Causa}` con códigos estables: UNSUPPORTED_FORMAT,
FILE_TOO_LARGE, READ_FAILED, DECODE_FAILED, PARAM_MISMATCH, NO_TRACKS, TOO_MANY_TRACKS,
TOTAL_TOO_LARGE, INVALID_ORDER, INVALID_OPTIONS, USER_CANCELLED, WRITE_FAILED,
UNKNOWN_ERROR. La GUI nunca inventa textos: usa las plantillas de i18n.

## Coste introducido
- Doble capa (código + mensaje) en cada fallo.

## Alternativas descartadas
- Errores de cadena libre: imposibles de clasificar o traducir coherentemente.
