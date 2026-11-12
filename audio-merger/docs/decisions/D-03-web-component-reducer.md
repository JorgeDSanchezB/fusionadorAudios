# D-03 — Web Component + Shadow DOM + reducer propio

- **Problema:** la herramienta debe incrustarse en cualquier página (HTML plano,
  React, Vue, lo que sea) sin chocar con los estilos ni el framework anfitrión, y debe
  ser probada como unidad.
- **Decisión:** Custom Element `<audio-merger>` con Shadow DOM y estilos por
  `adoptedStyleSheets` (una sola hoja compartida, sin CSS externo). Estado con un
  reducer puro dentro del componente (estado inmutable + acciones tipadas) y
  re-renderizado selectivo por regiones (toolbar / lista / estado / resultado).
- **Coste:** render y diff manuales (sin DOM reactivo): exigimos disciplina de
  renderizado por regiones y reutilización de filas por clave. No hay ecosistema de
  componentes: átomos propios mínimos.
- **Alternativa descartada (1):** Lit — estado reactivo cómodo, pero añade runtime al
  bundle y su virtualizador `@lit-labs/virtualizer` arrastra Lit completo: presupuesto
  de 30 KB gzip en riesgo. **Alternativa descartada (2):** React/Vue embebido —
  framework entero para un widget aislado, contradictorio con el requisito
  “sin framework”. **Alternativa descartada (3):** Redux/Zustand — sobredimensionado
  para estado local de un componente.

# Anti-sobreingeniería

El reducer no es un patrón “de moda”: elimina clases de bugs de estado (transiciones
de job `idle→merging→done|error|cancelled`) y es la única pieza de estado de la app.
No hay stores globales, ni contexts, ni DI: los registros (formatos, salidas,
post-procesos) son objetos congelados + funciones puras de validación.
