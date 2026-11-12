# D-19 — Correcciones 1.0.3 tras la auditoría adversarial (y refutación de H1 con cabecera real)

## Problema que resuelve
El árbitro de la 1.0.2 (INFORME_ARBITRO_FIX_1_0_2.md) hallazgos H2, H3 y H4, y el
contraste de TODAS las constantes contra una fuente AUTORITATIVA en lugar de
reconstrucciones de memoria (el propio árbitro demostró que las «tablas canónicas»
reconstruidas —incluida la suya— no son fiables: su H1 era errónea).

## Decisión
1. **Fuente de verdad para constantes**: se descargó `include/commctrl.h` del mirror
   de Wine (raw.githubusercontent.com/wine-mirror/wine) y se contrastó cada valor
   mecánicamente. Resultado: `LVM_GETSELECTEDCOUNT = LVM_FIRST + 50` (el valor del
   código, SIN CAMBIO — H1 del árbitro REFUTADA: +48 es LVM_SORTITEMS, +49 es
   LVM_SETITEMPOSITION32, +50 es GETSELECTEDCOUNT, +51 GETITEMSPACING); `LVN_BEGINDRAG
   = LVN_FIRST-9`, `LVM_SETINSERTMARK = +166`, `LVM_HITTEST = +18` y todas las demás
   YA correctas.
2. **H2 (cierto, corregido)**: `LVM_GETITEMRECT` era `+15` (= `LVM_SETITEMPOSITION`);
   correcto `+14`. Con +15 el control devolvía FALSE y el refino «mitad inferior de
   la fila = insertar después» nunca se aplicaba (el arrastre funcionaba pero con el
   punto de inserción anclado al borde superior de la fila).
3. **H3 (cierto, corregido)**: `LVINSERTMARK` se definió sin `CbSize`. La estructura
   REAL es `{UINT cbSize; DWORD dwFlags; int iItem; DWORD dwReserved}` = 16 B y
   `LVM_SETINSERTMARK` exige `cbSize == sizeof(LVINSERTMARK)` o devuelve FALSE ⇒ la
   marca de inserción JAMÁS se pintaba. Ahora el struct es canónico, `dwFlags` usa
   `LVIM_AFTER` (0x1) y `ponerMarca` rellena `CbSize`/`DwReserved` en un único punto.
4. **H4 (cierto, corregido)**: guards `!arrastrando` en `anadirArchivos`,
   `quitarSeleccion`, `moverSeleccion`, `vaciar`, `iniciarFusion` y `menuContextual`:
   durante un arrastre el teclado sigue bombeando y Alt+↑/↓ o Supr mutarían
   `a.pistas` dejando `dragOrigen` obsoleto.
5. **H5 (higiene)**: eliminada la constante muerta `LVM_GETITEMCOUNT` añadida sin uso
   en la 1.0.2 (la preexistente `LVM_GETSELECTIONMARK` se mantiene por mínimo diff).

## Coste introducido
Ninguno funcional: tres correcciones puntuales + guards defensivos baratos.

## Alternativas descartadas
- Confiar en la reconstrucción del árbitro (H1 «+48»): REFUTADA por la cabecera real;
  cambiarla habría ROTO los botones Quitar/Subir/Bajar (que funcionan con +50).
- Confiar en la tabla de la auditoría 1.0.0 (Task 16): ya bendijo +78/+75 erróneos.

## Verificación
Compilación cruzada + vet aquí; contraste mecánico contra commctrl.h real (wine);
build reproducible (exe + instalador). La ejecución GUI en Windows real sigue siendo
la única verificación definitiva (repro en README).
