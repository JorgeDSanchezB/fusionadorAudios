# D-17 — Dos constantes LVM erróneas en 1.0.1 (lista sin contenido y sin selección)

## Problema que resuelve
Reporte de usuario tras la 1.0.1: «no me mostró por ningún lado que cargó» y «no pude
elegir el orden» al fusionar. Los archivos SÍ se añadían a `a.pistas` (el botón
Fusionar se activaba y la fusión corría), pero la lista no mostraba nombre/formato/
duración/info y la selección programática jamás surtía efecto.

## Diagnóstico (lectura de `win32.go`; valores contrastados con commctrl.h REAL — cabecera wine, ver D-19)
- `LVM_SETITEMW` estaba declarado `LVM_FIRST + 78` — ese número es `LVM_GETTOOLTIPS`
  (lectura, sin efecto de escritura); el correcto es `LVM_FIRST + 76`.
  `textoItem(..., sub ≥ 1, ...)` escribía Nombre/Formato/Duración/Info por esa vía:
  **esas columnas quedaban siempre vacías** (solo se veía la columna `#`, insertada
  con `LVM_INSERTITEMW = +77`, que sí era correcto).
- `LVM_SETITEMSTATE` estaba declarado `LVM_FIRST + 75` — ese número es
  **`LVM_GETITEMW`**; el correcto es `LVM_FIRST + 43`. `seleccionar()` en realidad
  hacía una LECTURA: la selección programática nunca se aplicaba → sin resaltado de
  confirmación tras añadir, Subir/Bajar nunca se habilitaban por código y el
  re-seleccionado tras mover no funcionaba.
- Consecuencia combinada exacta del reporte: lista aparentemente vacía → el usuario
  no podía ver/seleccionar/reordenar → la fusión usaba el orden alfabético con el que
  `GetOpenFileNameW` devuelve la multiselección → «se mezcló en desorden».

## Decisión
Corregir ambos valores a los de commctrl.h (+76 y +43). Además: al añadir pistas se
resalta la última añadida (feedback visible de «cargó») y se reescribe
`moverSeleccion` con marcas posicionales (el algoritmo anterior usaba índices
obsoletos: solo movía bien selecciones de UNA pista).

## Coste introducido
Ninguno (son correcciones puntuales de constantes; el resto del flujo no cambia).

## Alternativas descartadas
- Ninguna: es un error de transcripción; no hay diseño alternativo que lo justifique.

## Verificación
Aquí (Linux) solo compilación/vet + tests del motor; la ejecución GUI real en Windows
queda pendiente de repro del usuario (igual que D-16). Tras la auditoría adversarial
1.0.2 se descargó la cabecera real de wine (include/commctrl.h) y se verificó cada
valor mecánicamente: +76/+77/+43/+97/+50 correctos; correcciones derivadas en D-19
(GETITEMRECT +14, LVINSERTMARK con CbSize). NOTA: la reconstrucción «+48» para
`LVM_GETSELECTEDCOUNT` del informe 1.0.2 (H1) quedó REFUTADA por la cabecera real:
`+48` es `LVM_SORTITEMS` y `+50` es `LVM_GETSELECTEDCOUNT` — el valor del código era
y es correcto.
