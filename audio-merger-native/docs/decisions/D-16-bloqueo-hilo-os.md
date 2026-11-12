# D-16 — Bloqueo del hilo del SO para el bucle de mensajes Win32 (fix del cuelgue de la 1.0.0)

## Problema que resuelve
Reporte de usuario real en Windows: el programa instalado (1.0.0) **se cuelga al
intentar cargar cualquier audio** — la ventana abre, pero al usar «Añadir audios…»
(el diálogo de archivos) la GUI deja de responder para siempre.

Causa raíz verificada en el código: el bucle de mensajes
(`GetMessageW`/`DispatchMessageW`, `internal/gui/app.go`) corría en una goroutine
**sin `runtime.LockOSThread()`**. Win32 reparte los mensajes de una ventana
**solo al hilo del SO que la creó**. El runtime de Go, cuando una goroutine
lleva bloqueada en un syscall más de ~20 µs (sysmon retoma su P), puede
reasignarla a **otro hilo** al volver del syscall. El `GetOpenFileNameW` modal
bloquea segundos (el usuario navegando), y el `GetMessageW` en reposo bloquea
todo el rato: en cuanto la goroutine del bucle migra de hilo, se queda esperando
en la cola de mensajes de un hilo equivocado y **la ventana real nunca vuelve a
procesar mensajes** → congelado total, sin crash, sin error.

Por eso nunca se manifestó en Linux (la GUI no se ejecuta allí; la auditoría
estática de la 1.0.0 —incluida la del árbitro— pasó por alto esta afición de
hilo: es un invariant de runtime, no un defecto visible en el código Win32).

## Decisión
`runtime.LockOSThread()` al inicio de `main()` y de `gui.Ejecutar()` (defensa en
profundidad), **antes de crear cualquier ventana**. El hilo queda cableado a la
goroutine del bucle durante toda la vida del proceso. El worker de fusión sigue
en su propia goroutine y solo habla con la UI vía `PostMessage` (asíncrono,
seguro entre hilos) — ese diseño ya era correcto.

Versión 1.0.1 (exe, VERSIONINFO, manifiesto e instalador actualizados en cadena).

## Coste introducido
- Un hilo del proceso queda dedicado a la UI (irrelevante: Go crea los hilos que
  necesite para el resto del trabajo; el motor es multipista).
- No hay cambios en el motor, el formato de datos, los tests ni el instalador
  (más allá del número de versión).

## Alternativas descartadas
- **No fix / «no puede ser»**: el síntoma del usuario casa al 100 % con la
  mecánica descrita y es EL fallo canónico de Go+Win32 documentado (la propia
  documentación de Go exige LockOSThread para frameworks GUI). Descartado no arreglarlo.
- **Hilo de UI dedicado a mano** (goroutine propia con canal de comandos):
  más código y complejidad sin beneficio — `main` ya es el hilo de UI natural.
- **Tolerar migraciones en wndProc**: imposible; la semántica de Win32 no lo permite.
- **Electron/Tauri/WebView2**: contradice «nativo y únicamente la herramienta» (D-01).
