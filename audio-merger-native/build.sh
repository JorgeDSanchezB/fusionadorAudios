#!/usr/bin/env bash
# Build reproducible del Fusionador de Audio (Windows x64) desde Linux.
#
# Requisitos (toolchains de usuario, sin root — D-08):
#   - Go >= 1.27 en $GO_DIR (p. ej. /home/z/toolchain/go)
#   - NSIS 3.11 extraído de .deb en $NSIS_EXTRACT (p. ej. .../nsis-debs/extracted/usr)
#
# Uso:  ./build.sh
set -euo pipefail

GO_DIR="${GO_DIR:-/home/z/toolchain/go}"
NSIS_EXTRACT="${NSIS_EXTRACT:-/home/z/toolchain/nsis-debs/extracted/usr}"
MAKENSIS="$NSIS_EXTRACT/bin/makensis"
NSISDIR="$NSIS_EXTRACT/share/nsis"

export PATH="$GO_DIR/bin:$PATH"
export CGO_ENABLED=0

cd "$(dirname "$0")"
VERSION="$(grep -oP 'Version = "\K[^"]+' internal/config/defaults.go)"

echo "==> 1/7: Tests del motor (Linux, fixtures ffmpeg reales)"
go test ./internal/audio/ -count=1 -timeout 300s

echo "==> 2/7: Icono programático"
go run ./tools/genicon resources/icon.ico

echo "==> 3/7: Recursos PE (icono + manifiesto + VERSIONINFO)"
go run github.com/josephspurrier/goversioninfo/cmd/goversioninfo@latest \
  -o cmd/audio-merger/resource_windows_amd64.syso resources/versioninfo.json

echo "==> 4/7: FusionadorDeAudio.exe (PE32+ x64, GUI, CON símbolos — D-21)"
mkdir -p dist
# Sin "-s -w": conservar la tabla de símbolos deja que los heurísticos de los
# antivirus lean el interior del binario Go y bajen los falsos positivos.
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H windowsgui" \
  -o "dist/FusionadorDeAudio.exe" ./cmd/audio-merger
file dist/FusionadorDeAudio.exe

echo "==> 5/7: Instalador NSIS (español, por usuario)"
cp LICENSE installer/licencia.txt
( cd installer && NSISDIR="$NSISDIR" "$MAKENSIS" audio-merger.nsi ) >/dev/null
file "installer/FusionadorDeAudio-Setup-${VERSION}-x64.exe"

echo "==> 6/7: Portable ZIP (sin instalador — evita falsos positivos AV)"
rm -rf "dist/portable"
mkdir -p "dist/portable"
cp dist/FusionadorDeAudio.exe "dist/portable/"
cp LICENSE "dist/portable/LICENSE.txt"
cp portable-leeme.txt "dist/portable/LEEME-PORTABLE.txt"
( cd dist/portable && zip -X -r "../FusionadorDeAudio-Portable-${VERSION}-x64.zip" . ) >/dev/null
file "dist/FusionadorDeAudio-Portable-${VERSION}-x64.zip"

echo "==> 7/7: Copia a download/"
mkdir -p ../download
cp "installer/FusionadorDeAudio-Setup-${VERSION}-x64.exe" "../download/"
cp "dist/FusionadorDeAudio-Portable-${VERSION}-x64.zip" "../download/"

echo
echo "OK: download/FusionadorDeAudio-Setup-${VERSION}-x64.exe"
echo "OK: download/FusionadorDeAudio-Portable-${VERSION}-x64.zip"
