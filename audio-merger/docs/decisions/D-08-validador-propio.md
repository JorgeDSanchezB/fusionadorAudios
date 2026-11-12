# D-08 — Validador declarativo propio de opciones y configuración

- **Problema:** las opciones y la configuración deben validarse contra un esquema
  EXTENSIBLE por registro (Regla del Carro) y la configuración global proviene de
  atributos HTML no fiables; además el presupuesto es ≤ 30 KB gzip.
- **Decisión:** validador declarativo propio (~90 líneas, `core/validation.ts`) con
  `OptionSchema { type, min, max, nullable, values (estáticos|función) }` + reglas de
  configuración explícitas (`config/validate.ts`) que devuelven problemas accionables
  (`CONFIG_INVALID` con lista). Claves desconocidas rechazadas. Defaults SOLO para
  claves ausentes, nunca para tapar valores inválidos.
- **Coste:** nosotros mantenemos el validador (sin ecosistema de JSON Schema:
  mensajes de error custom, formatos, $ref).
- **Alternativa descartada:** ajv + JSON Schema — ≈ 35 KB gzip min solo el runtime
  estándar: descuadra el presupuesto del bundle inicial; para ~6 tipos de campo es
  sobredimensionado.
