# D-06 — Virtualización propia por ventanas, condicional

- **Problema:** la lista debe soportar N grande (cientos de pistas) sin que el DOM ni
  el reorden se deterioren; pero el caso común documentado para esta herramienta es
  ≤ 50 pistas (supuesto de diseño declarado, no métrica medida) y el presupuesto de
  bundle es de 30 KB gzip.
- **Decisión:** renderizado de filas por ventanas (windowing) propio (~90 líneas):
  contenedor con altura total sintética + solo se montan las filas visibles ± margen.
  Se activa SOLO cuando `n > virtualizeThreshold` (config, por defecto 50). Claves
  estables: `id` UUID generado al añadir, nunca el índice.
- **Coste declarado:** con virtualización activa se desactiva el arrastrar-y-soltar
  (los objetivos fuera de la ventana no existen en el DOM); el reorden sigue siendo
  COMPLETO por botones ↑/↓ y por API (`reorder`, `moveTrack`). Se informa en la propia
  UI. Además la altura de fila se fija por configuración (`virtualRowHeightPx`) porque
  el cálculo de posiciones lo exige.
- **Alternativa descartada (1):** `@lit-labs/virtualizer` — arrastra Lit al bundle
  (runtime + dependencia) para una lista de altura fija; rompe el presupuesto y añade
  una dependencia de framework a un componente “sin framework”.
  **Alternativa descartada (2):** virtualización siempre activa — complejidad innecesaria
  para ≤ 50 filas y DnD se perdería siempre (peor UX para el caso común).
  **Alternativa descartada (3):** paginación — el usuario pierde la visión global del
  orden, que es exactamente lo que necesita manipular.

# Complejidad real de las operaciones (declarada)

- Añadir N archivos: O(N) filas (o O(ventana) si virtualiza) + lectura de metadatos
  por archivo (async, no bloqueante).
- Reorden por botón/DnD: O(1) sobre el array de ids + O(N) re-append de filas existentes
  (sin recrear); con virtualización O(ventana).
- Merge: dominado por ffmpeg (I/O del core); la UI solo refleja progreso.
