# D-15 — Recursos del PE vía goversioninfo (icono + manifiesto + VERSIONINFO)

## Problema que resuelve
El .exe debe tener icono en el Explorador, manifiesto (comctl32 v6, DPI-aware,
UTF-8 activo) y metadatos de versión en Propiedades→Detalles.

## Decisión
`tools/goversioninfo` (ejecutado en build) emite resource_windows_amd64.syso que el
linker de Go embebe automáticamente: icono (ID 1, cargado por LoadIconW), manifiesto
app.manifest (PerMonitorV2 no; dpiAware sistema + comctl32 v6 + activeCodePage UTF-8)
y VERSIONINFO (Producto 1.0.0, descripción, copyright).

## Coste introducido
- Paso extra en el build (automatizado en build.sh).

## Alternativas descartadas
- **akavel/rsrc**: sin soporte VERSIONINFO.
- **Sin recursos**: sin icono ni DPI-aware — presentación pobre.
