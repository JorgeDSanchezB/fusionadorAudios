# D-12 — Todos los textos en castellano centralizados (internal/i18n/es.go)

## Problema que resuelve
Requisito de idioma del proyecto: UI y errores en castellano, sin textos dispersos.

## Decisión
- **GUI**: un único archivo `internal/i18n/es.go` con TODOS los literales de la
  interfaz (ventana, botones, columnas, menús, diálogos, mensajes de resultado) y
  las plantillas genéricas de error por código. Nada de la GUI inventa textos.
- **Motor**: produce los mensajes de error ESPECÍFICOS en el punto del fallo
  (con nombre de archivo, offset, parámetros reales), porque solo allí existen
  los datos. Enmienda sobre el borrador inicial: se decidió no forzar una doble
  capa código→plantilla→formato para los detalles del motor; el reparto queda
  GUI→i18n (100%) / motor→detalle in-situ, documentado aquí.
- El instalador NSIS usa MUI2 con idioma Spanish (sus literales viven en el
  .nsi, único ámbito de texto del instalador).
- Formato castellano: coma decimal (44,1 kHz · 3,4 MB), helpers en i18n.

## Coste introducido
- Los ~40 literales de detalle del motor no están en es.go (están junto al
  fallo que describen; auditables con `rg '"[A-Za-zÁÉÍÓÚáéíóúñ]' internal/audio`).

## Alternativas descartadas
- Literales en línea: imposibles de auditar/revisar.
- Sistema de traducciones multi-idioma: fuera de alcance (el requisito es castellano).
