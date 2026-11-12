# D-07 — Instalador por usuario (%LOCALAPPDATA%\Programs), sin UAC

## Problema que resuelve
Instalación 100% silenciosa de permisos: la herramienta no toca el sistema y no
requiere ser administrador.

## Decisión
NSIS con `RequestExecutionLevel user`, InstallDir `$LOCALAPPDATA\Programs\FusionadorDeAudio`,
atajos y desinstalador bajo HKCU / menú del usuario actual.

## Coste introducido
- Solo instala para el usuario que ejecuta el instalador (documentado en la página
  de componentes).

## Alternativas descartadas
- **ProgramFiles64 + admin**: pide UAC sin necesidad real.
- **MultiUser.nsh (ambos modos)**: duplica la superficie de prueba del instalador.
