# D-02 — GUI Win32 por syscalls del estándar (sin framework)

## Problema que resuelve
Mantener «únicamente la herramienta»: cero dependencias de GUI, binario pequeño y
aspecto nativo de Windows real (comctl32 v6, Segoe UI, DPI).

## Decisión
Ventana y controles creados con `syscall.NewLazyDLL` sobre user32/comdlg32/comctl32:
ListView, botones, ComboBox, ProgressBar, StatusBar, diálogos nativos
GetOpenFileNameW/GetSaveFileNameW y arrastre de archivos (WM_DROPFILES).

## Coste introducido
- Más código manual (WndProc, bucle de mensajes, layout en WM_SIZE).
- La GUI solo se puede ejecutar en Windows: aquí se verifica COMPILACIÓN para
  windows/amd64 y se declara «no verificada en ejecución» con repro (véase informe).

## Alternativas descartadas
- **lxn/walk**: dependencia extra + manifiesto obligatorio; ganancia escasa.
- **Fyne/Gio**: binarios enormes y aspecto no nativo.
- **getlantern/systray**: no es una aplicación de ventana.
