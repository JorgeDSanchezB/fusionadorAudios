# D-09 — Reordenar con botones Subir/Bajar (+ Alt+↑/↓), sin arrastre interno

## Problema que resuelve
Reordenar pistas de forma robusta y accesible por teclado.

## Decisión
Botones «Subir»/«Bajar» que mueven la selección (bloque contiguo), aceleradores
Alt+↑/Alt+↓, menú contextual en la lista y borrado con Supr.

## Coste introducido
- No hay arrastre DENTRO de la lista (la paridad con la web no es total). El arrastre
  DE ARCHIVOS desde el Explorador sí está soportado (WM_DROPFILES).

## Alternativas descartadas
- **LVN_BEGINDRAG + ImageList_Drag* manual**: frágil, sin posibilidad de ejecutarlo
  aquí para verificar — riesgo alto de entregar roto.
