# FASE 5 — Estrategia de renderizado y listas

## Claves estables, nunca el índice

Cada pista nace con `id: UUID` (`crypto.randomUUID`, fallback declarado). La lista
renderiza por `id`: `filas: Map<id, HTMLLIElement>` se reconcilia reutilizando
elementos (creación solo para ids nuevos, borrado para ids fuera del orden, re-append
en el orden vigente). El reorden NO recrea filas (D-03/D-06).

## Virtualización condicional (D-06)

- Umbral: `n > config.virtualization.threshold` (50 por defecto). Por debajo: DOM
  completo con DnD. Por encima: el CONTENEDOR de lista recibe
  `max-height: config.virtualization.maxHeightPx` (480 px por defecto) +
  `overflow-y: auto` para que el scroll ocurra DENTRO de la lista; un espaciador
  da la altura total (`n × rowHeightPx`, fila 72 px por defecto) y solo se montan
  las filas de la ventana ± overscan (4). Verificable en test (jsdom): con 55
  pistas hay menos filas montadas que pistas.
- El DnD se desactiva en modo virtual (objetivos fuera de ventana no existen) y la
  UI lo comunica (`lista.virtual`); el reorden sigue COMPLETO por botones ↑/↓ y API.
- Complejidades declaradas: añadir O(N); reorden O(N) re-append (O(ventana) virtual);
  lookup O(1) por id.

## Estados visuales diferenciados (tolerancia a fallos en la UI)

| Situación | Tratamiento visual |
|---|---|
| Campo opcional ausente (duración desconocida) | «duración desconocida» — nunca una cifra inventada |
| Valor nulo (nombre vacío) | «(sin nombre)» |
| Dato inválido (formato/tamaño/corrupto) | fila con borde rojo + chip «No se puede unir» + `title` con el código; excluida de la unión sin tumbar la lista. Se marca al fallar la sonda en una unión (CORRUPT_FILE/UNSUPPORTED_FORMAT por pista) y queda excluida de la siguiente |
| Error temporal (carga del WASM) | panel de error con botón **Reintentar** (códigos reintenibles de config) |
| Error de configuración | panel con `code: CONFIG_INVALID`, atributo citado y consejo accionable |
| Fallo crítico (OOM) | clasificación heurística + panel con consejo (menos pistas / MP3 en vez de WAV / cerrar pestañas) |

Estados del componente (`get state`): `idle · analyzing · running · completed ·
error · cancelled` — todos presentes en la UI (`cancelled` persiste tras la
cancelación con el texto «Unión cancelada», sin panel de error).

## Re-renders acotados

El componente re-renderiza por REGIONES: herramientas / lista / estado / resultado /
error. La lista solo cuando cambia `orden` o alguna pista (add/remove/move/duración).
La barra de estado se actualiza en cada `merge-progress` (texto + `aria-valuenow`),
sin tocar la lista. `onProgress` del orquestador es monotónico por contrato (FASE 3).

## Accesibilidad

- Botones **↑/↓/✕ por fila, siempre visibles** (44 px de objetivo táctil aproximado:
  34 px + padding del contenedor), `aria-label` con el nombre de la pista
  («Subir entrevista.mp3»).
- `role="list"`/`listitem` + `aria-roledescription` («Pista 3»).
- DnD: `draggable` en fila + `aria-roledescription`; tras soltar, anuncio en la
  región `aria-live="polite"` (««X» movida a la posición 2»).
- Progreso: barra `role="progressbar"` con `aria-valuemin/max/now` + texto en
  `role="status" aria-live="polite"`.
- Foco: tras eliminar una pista, el foco pasa al botón ✕ de la fila siguiente
  (o a la zona de carga si la lista queda vacía); tras mover con botones, el foco
  se mantiene en el mismo botón de la fila movida.
- Diálogo de aviso: `role="alertdialog"` + `aria-modal` + foco inicial en
  «Continuar» + `Escape` = cancelar.
- Zona de carga: `role="button"` + `tabindex=0` + activación por teclado
  (Enter/Espacio) + arrastre de archivos del sistema.

## Tema y estilos

Hoja adoptada por Shadow DOM (`adoptedStyleSheets`, fallback a `<style>`), tema
`auto` (prefers-color-scheme) / `light` / `dark` por atributo. Paleta neutra con
acento esmeralda. Cero dependencias CSS.
