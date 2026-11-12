# D-18 — Reordenación por arrastre dentro de la lista (ampliación de D-09)

## Problema que resuelve
El gesto intuitivo del usuario para reordenar es ARRASTRAR filas dentro de la lista.
D-09 descartó el arrastre interno por el riesgo de `LVN_BEGINDRAG` + `ImageList_Drag*`
manual (frágil e inejecutable aquí). El reporte de la 1.0.1 («no pude elegir el
orden») muestra que los botones solos, con la lista sin contenido visible (D-17), no
bastaban.

## Decisión
Implementar el arrastre con el patrón clásico de Win32 **sin OLE, sin ImageList_Drag
y sin subclases**, de modo que TODOS los mensajes llegan al `wndProc` que ya existe:

1. `LVN_BEGINDRAG` (WM_NOTIFY) indica la pista arrastrada.
2. El padre roba el capturador: `SetCapture(hwnd principal)` → desde ese momento el
   padre recibe TODO el ratón, aunque esté sobre el ListView hijo.
3. `WM_MOUSEMOVE`: hit-test (`LVM_HITTEST` + `LVM_GETITEMRECT`) → índice de inserción
   (mitad inferior de la fila = «después») → marca visual `LVM_SETINSERTMARK`
   (requiere comctl32 v6: ya la activa el manifiesto; sin v6 degrada sin guía visual
   pero el arrastre sigue funcionando). Si soltar ahí sería un no-op, se oculta la marca.
4. `WM_LBUTTONUP`: se reordena `a.pistas` (quitar + insertar en el hueco), refresco y
   re-selección de la pista movida. `WM_CAPTURECHANGED` cancela limpio si algo externo
   roba el capturador.

Los botones «Subir»/«Bajar», Alt+↑/↓, Supr y el menú contextual de D-09 **se
mantienen** como vía garantizada y accesible por teclado: si el arrastre fallara en
una máquina concreta, el reordenado sigue siendo posible (degradación, no pérdida).

## Coste introducido
- El arrastre mueve UNA pista (la agarrada); la selección múltiple se reordena con
  botones (declarado, no ambiguo).
- Sin posibilidad de ejecutarlo en este entorno (Linux): riesgo residual declarado;
  el patrón es el documentado clásico de captura en el padre, sin efectos sobre el
  hilo de UI (todo ocurre en el `wndProc`, mismo hilo, D-16 intacto).
- Robar el capturador al ListView deja su estado interno de botón pulsado «colgado»
  hasta el siguiente clic: inofensivo (el control lo resetea al siguiente
  button-down), y es el mismo trade-off de los ejemplos clásicos de arrastre manual.

## Alternativas descartadas
- **OLE IDropTarget/DoDragDrop**: registro, más código COM y más superficies de fallo.
- **Subclase del ListView (SetWindowSubclass)**: otro callback con aridad distinta y
  estado que guardar; innecesario si el padre captura el ratón.
- **ImageList_Drag*** (lo descartado en D-09): arrastrar una «imagen fantasma» de la
  fila; complejo y frágil sin verificación posible aquí.
- **Solo botones (D-09 original)**: funcional pero contra la intuición del usuario
  (reporte real de la 1.0.1).
