# D-01 — Cliente puro, sin backend

- **Problema:** la herramienta debe embeberse en cualquier web con dos etiquetas y sin
  infraestructura; los audios del usuario son datos personales que no deben salir del
  dispositivo.
- **Decisión:** todo el procesado en el navegador (WebAssembly). Sin llamadas de red
  propias salvo la descarga del motor desde CDN/autohospedado.
- **Coste:** techo de memoria de pestaña (~2 GB) como límite práctico del tamaño de
  salida; velocidad limitada a la CPU local (más lenta que un servidor, en especial en
  móvil); el motor WASM pesa ~32 MB y se descarga la primera vez.
- **Alternativa descartada:** API con ffmpeg nativo en servidor. Más rápida y sin techo
  de RAM, pero exige infraestructura, subida de archivos del usuario (privacidad),
  control de costes y configuración — todo vetoado por los requisitos (embed sin
  configuración, sin backend en v1).

# Notas de arquitectura

La capa `core` es pura y no toca DOM ni red: se prueba en Node con Vitest. La capa
`engine` concentra todos los efectos (worker, WASM, FS). La capa `ui` es el Web
Component. Ver `docs/plan.md` §6.
