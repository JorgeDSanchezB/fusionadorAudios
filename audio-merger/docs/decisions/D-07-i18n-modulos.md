# D-07 — i18n por módulos de mensajes

- **Problema:** UI y documentación en castellano, con la puerta abierta a más idiomas
  sin tocar el núcleo; y cero literales de usuario dispersos por el código (auditable).
- **Decisión:** un módulo por idioma (`i18n/es.ts`) con TODOS los textos (incluido
  mensaje+consejo por cada `ErrorCode` y cada `WarningCode`), un registro
  (`i18n/index.ts`) y una función `t(clave, params)` con interpolación `{clave}`.
  Los descriptores del registro de formatos referencian CLAVES de i18n, no texto.
  El test de completitud impide que un código de error nazca sin texto.
- **Coste:** una capa de claves que hay que mantener (mitigada con el test);
  interpolación propia minúscula. Limitación declarada: los DETALLES técnicos que la UI
  interpola en `{detalle}` (p. ej. la lista de problemas de `INVALID_OPTIONS`/
  `CONFIG_INVALID`) se generan en castellano por el core; un futuro idioma heredaría
  esos detalles técnicos hasta que el core los externalice (v1 es solo-es).
- **Alternativa descartada:** i18next (+ICU) — dependencia de runtime y ~10-16 KB gzip
  de presupuesto para un idioma de serie; plurales y género gestionados con claves
  específicas (`toolbar.pista1`/`toolbar.pistas`) suficientes para esta UI.
