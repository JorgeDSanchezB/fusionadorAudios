; Instalador del Fusionador de Audio (NSIS 3.11, español).
; Instalación POR USUARIO (D-07): $LOCALAPPDATA\Programs\FusionadorDeAudio,
; sin UAC, sin tocar el sistema. Contiene ÚNICAMENTE la herramienta (D-01).

Unicode true
ManifestDPIAware true

!include "MUI2.nsh"

!define PRODUCTO "Fusionador de Audio"
!define VERSION "1.0.3"
!define EXE "FusionadorDeAudio.exe"
!define EMPRESA "Fusionador de Audio"
!define IDINST "FusionadorDeAudio"

Name "${PRODUCTO} ${VERSION}"
OutFile "FusionadorDeAudio-Setup-${VERSION}-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\FusionadorDeAudio"
InstallDirRegKey HKCU "Software\${IDINST}" "InstallDir"
RequestExecutionLevel user
; zlib (NO lzma sólida): los antivirus marcan mucho menos los instaladores
; NSIS con compresión sólida LZMA — falso positivo tipo Wacatac.B!ml (D-20).
SetCompressor zlib

; ---- Version info del instalador ----
VIAddVersionKey "ProductName" "${PRODUCTO} — instalador"
VIAddVersionKey "FileDescription" "Instalador del ${PRODUCTO}"
VIAddVersionKey "FileVersion" "${VERSION}.0"
VIAddVersionKey "ProductVersion" "${VERSION}.0"
VIAddVersionKey "LegalCopyright" "© 2025, licencia MIT"
VIProductVersion "${VERSION}.0"

; ---- MUI2 ----
!define MUI_ICON "..\resources\icon.ico"
!define MUI_UNICON "..\resources\icon.ico"
!define MUI_ABORTWARNING "¿Seguro que quieres salir de la instalación del ${PRODUCTO}?"

!insertmacro MUI_PAGE_LICENSE "licencia.txt"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Ejecutar el ${PRODUCTO} ahora"
!define MUI_FINISHPAGE_TITLE "Instalación completada"
!define MUI_FINISHPAGE_TEXT_LARGE
!define MUI_FINISHPAGE_TEXT "El ${PRODUCTO} se ha instalado en tu carpeta de usuario.$\r$\n$\r$\nPuedes desinstalarlo desde Configuración › Aplicaciones o desde el acceso directo «Desinstalar» del menú Inicio.$\r$\n$\r$\nRecuerda: acepta WAV, MP3, OGG (Vorbis) y FLAC; todo se procesa en tu equipo, sin subir nada a internet."
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Spanish"

; ---- Secciones ----
Section "${PRODUCTO} (necesario)" SecPrincipal
  SectionIn RO
  SetOutPath "$INSTDIR"
  File /oname=${EXE} "..\dist\FusionadorDeAudio.exe"
  File /oname=LICENSE.txt "..\LICENSE"
  File /oname=LEEME.txt "..\instalador-leeme.txt"

  ; Atajo del menú Inicio (usuario actual).
  CreateDirectory "$SMPROGRAMS\${PRODUCTO}"
  CreateShortcut "$SMPROGRAMS\${PRODUCTO}\${PRODUCTO}.lnk" "$INSTDIR\${EXE}"
  CreateShortcut "$SMPROGRAMS\${PRODUCTO}\Desinstalar ${PRODUCTO}.lnk" "$INSTDIR\Desinstalar.exe"
  CreateShortcut "$SMPROGRAMS\${PRODUCTO}\LÉEME.lnk" "$INSTDIR\LEEME.txt" "" "$INSTDIR\LEEME.txt" 0

  ; Registro de desinstalación (HKCU: sin admin).
  WriteRegStr HKCU "Software\${IDINST}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}" "DisplayName" "${PRODUCTO}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}" "Publisher" "${EMPRESA}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}" "UninstallString" "$INSTDIR\Desinstalar.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}" "NoModify" "1"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}" "NoRepair" "1"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}" "InstallLocation" "$INSTDIR"

  WriteUninstaller "$INSTDIR\Desinstalar.exe"
SectionEnd

Section "Atajo en el escritorio" SecEscritorio
  CreateShortcut "$DESKTOP\${PRODUCTO}.lnk" "$INSTDIR\${EXE}"
SectionEnd

; ---- Descripción de componentes ----
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecPrincipal} "El programa y sus accesos en el menú Inicio. Obligatorio."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecEscritorio} "Añade un acceso directo en el escritorio."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ---- Desinstalador ----
Section "Uninstall"
  Delete "$INSTDIR\${EXE}"
  Delete "$INSTDIR\LICENSE.txt"
  Delete "$INSTDIR\LEEME.txt"
  Delete "$INSTDIR\Desinstalar.exe"

  Delete "$DESKTOP\${PRODUCTO}.lnk"
  Delete "$SMPROGRAMS\${PRODUCTO}\${PRODUCTO}.lnk"
  Delete "$SMPROGRAMS\${PRODUCTO}\Desinstalar ${PRODUCTO}.lnk"
  Delete "$SMPROGRAMS\${PRODUCTO}\LÉEME.lnk"
  RMDir "$SMPROGRAMS\${PRODUCTO}"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${IDINST}"
  DeleteRegKey HKCU "Software\${IDINST}"
SectionEnd
