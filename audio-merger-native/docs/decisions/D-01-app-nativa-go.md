# D-01 — Aplicación 100% nativa en Go puro (CGO_ENABLED=0)

## Problema que resuelve
El usuario exige un programa «nativo» para Windows x64 que contenga «únicamente la
herramienta»: un único ejecutable sin runtimes, sin navegador embebido, sin componentes
externos instalables y sin telemetría.

## Decisión
Binario único compilado en Go estándar (`CGO_ENABLED=0 GOOS=windows GOARCH=amd64`):
sin dependencias de C, sin instalar nada en el sistema, se ejecuta directamente.

## Coste introducido
- La GUI debe escribirse contra la API Win32 (syscall) en lugar de usar un framework.
- El toolchain de compilación cruzada debe verificarse en Linux (hecho: prueba de humo
  PE32+ GUI x64 real).

## Alternativas descartadas
- **Electron**: ~200 MB con Chromium embebido; no es «nativo» ni «únicamente la
  herramienta».
- **Tauri**: requiere WebView2 del sistema (dependencia externa) y toolchain Rust+MinGW
  para compilar.
- **Envolver el Web Component en WebView2**: reutilizaría la web, pero vuelve al
  navegador y no cumple «nativo».
