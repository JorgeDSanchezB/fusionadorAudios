# D-08 — NSIS 3.11 extraído de .deb de Debian, sin root

## Problema que resuelve
Generar un instalador .exe REAL desde Linux sin permisos de administrador.

## Decisión
`apt-get download nsis nsis-common` + `dpkg-deb -x` a un prefijo de usuario; makensis
se ejecuta con `NSISDIR` apuntando al share/nsis extraído. Probado con un instalador
de humo real (PE Nullsoft generado, `file` lo confirma).

## Coste introducido
- Toolchain no estándar (documentado en build.sh para reproducibilidad).

## Alternativas descartadas
- **Inno Setup**: solo compila en Windows/wine (no disponible).
- **WiX/MSI**: requiere .NET SDK pesado.
- **Instalador casero en Go**: sin asistente/desinstalador estándar.
