# D-11 — Nombres internos sanitizados `p<N>.<ext>`

- **Problema:** los nombres de archivo del usuario llegan a ffmpeg como argumentos y
  entradas del FS virtual: comillas, saltos de línea, Unicode exótico o `../` son
  vectores de inyección de línea de comandos y de fugas de rutas; además el usuario
  final no debe depender de sanitización invisible para entender su lista.
- **Decisión:** el motor renombra internamente cada entrada a `p<N>.<ext>` (N =
  posición 1-based) y la salida a un nombre derivado del patrón configurado. Los
  nombres originales SOLO existen en la UI y los eventos. `<ext>` se valida contra el
  registro de formatos de entrada (solo `[a-z0-9]{1,8}`).
- **Coste:** indirección mínima (mapa id→nombre interno en el plan de unión).
- **Alternativa descartada:** escapar los nombres de usuario — cada shell/demuxer
  tiene reglas distintas; la sustitución total elimina la clase de problema.
