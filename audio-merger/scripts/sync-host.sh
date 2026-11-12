#!/usr/bin/env bash
# Sincroniza el host de demo (Next.js en ../) con los artefactos de la librería:
#  - dist (UMD + ESM)                → /audio-merger/
#  - core ffmpeg.wasm ST             → /ffmpeg/core/        (layout de D-13)
#  - fixtures reales de tests        → /fixtures/ y /samples/
#  - batería selftest del motor      → /selftest.html
# Uso: bun run sync:demo (desde audio-merger/). Requiere haber ejecutado `bun run build`.
set -euo pipefail
cd "$(dirname "$0")/.."

RAIZ_HOST=../public

mkdir -p "$RAIZ_HOST/audio-merger" "$RAIZ_HOST/ffmpeg/core" "$RAIZ_HOST/fixtures" "$RAIZ_HOST/samples"

cp dist/audio-merger.umd.js "$RAIZ_HOST/audio-merger/"
cp dist/audio-merger.es.js "$RAIZ_HOST/audio-merger/"

# Core single-thread oficial (mismo origen → sin blobs, sin COOP/COEP; D-02/D-13).
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js "$RAIZ_HOST/ffmpeg/core/"
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm "$RAIZ_HOST/ffmpeg/core/"
# Core multi-thread OPCIONAL (solo si se instala @ffmpeg/core-mt y se sirven COOP/COEP).
if [ -f node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.js ]; then
  mkdir -p "$RAIZ_HOST/ffmpeg/core-mt"
  cp node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.js "$RAIZ_HOST/ffmpeg/core-mt/"
  cp node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.wasm "$RAIZ_HOST/ffmpeg/core-mt/"
  cp node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.worker.js "$RAIZ_HOST/ffmpeg/core-mt/"
  echo "core-mt copiado (requiere COOP/COEP para usarse)."
fi

# Fixtures completos para la batería selftest + 3 de muestra para la demo.
cp tests/fixtures/tono-440-est.mp3 tests/fixtures/tono-880-mono.mp3 tests/fixtures/voz-sim.wav \
   tests/fixtures/tono-660.m4a tests/fixtures/ruido.oga tests/fixtures/tono-220.flac \
   tests/fixtures/tono-550.opus tests/fixtures/roto.mp3 "$RAIZ_HOST/fixtures/"
cp tests/fixtures/tono-440-est.mp3 tests/fixtures/voz-sim.wav tests/fixtures/tono-660.m4a "$RAIZ_HOST/samples/"

cp demo/selftest.html "$RAIZ_HOST/selftest.html"

echo "Sincronizado en $RAIZ_HOST:"
ls -la "$RAIZ_HOST/audio-merger" "$RAIZ_HOST/ffmpeg/core" | sed -n '1,12p'
