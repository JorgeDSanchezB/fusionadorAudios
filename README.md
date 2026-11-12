# fusionadorAudios

**Fusionador de Audio** — une varios archivos de audio (MP3, WAV, OGG, M4A, FLAC) en un solo archivo, en el orden que tú elijas. Gratis, sin cuentas, sin anuncios y **sin subir nada a internet**: todo el procesamiento ocurre en tu propio equipo.

Este repositorio contiene **dos versiones** de la misma herramienta:

| Versión | Tecnología | Dónde está | Estado |
|---|---|---|---|
| **Web** | Web Component + ffmpeg.wasm (puro cliente, sin servidor) | `src/` + `public/` + `audio-merger/` | Funcional, verificada |
| **Windows nativa** | Go + Win32 API (sin frameworks) + instalador NSIS | `audio-merger-native/` | v1.0.3, instalador + portable |

---

## Versión web

Aplicación Next.js que hospeda el Web Component `<audio-merger>` (librería propia en `audio-merger/`):

- Interfaz 100% en español.
- Arrastra archivos, **reordénalos** (botones Subir/Bajar) y une en MP3 o WAV.
- El motor (ffmpeg compilado a WASM, 31 MB en `public/ffmpeg/core/`) se **descarga en diferido** la primera vez que fusionas — la página carga ligera.
- Sin `SharedArrayBuffer` requerido: funciona en cualquier hosting estático.
- Mejora progresiva: el contenido es visible incluso si el JS del cliente no llega a ejecutarse (ver `audio-merger/docs/decisions/D-24-ssr-siempre-visible.md`).

```bash
# correr la web en local (puerto 3000)
bun install
bun run dev
```

## Versión Windows (nativa)

Programa nativo en Go puro con GUI por syscalls Win32 (user32/gdi32/comdlg32), sin frameworks ni runtimes externos. Empaquetada con NSIS.

```bash
# compilar desde Linux (cross-compile a Windows x64; requiere Go y NSIS)
cd audio-merger-native && ./build.sh
```

## Entregables listos para usar (carpeta `download/`)

- `FusionadorDeAudio-Setup-1.0.3-x64.exe` — instalador por usuario (no necesita permisos de administrador).
- `FusionadorDeAudio-Portable-1.0.3-x64.zip` — versión portable (descomprimir y ejecutar).
- `README.md` — instrucciones, tabla de hashes SHA-256/MD5 y evidencia de integridad (incluye el análisis del falso positivo de Kaspersky sobre el binario sin firmar).

## Estructura del repositorio

```
├── src/                      # Host Next.js de la web (landing + página principal)
├── public/                   # Estáticos: samples, build del widget, ffmpeg.wasm
├── audio-merger/             # Librería <audio-merger> (código fuente, tests, docs)
│   ├── src/                  #   core/, ui/, engine/, i18n/, config/, extensiones/
│   ├── docs/decisions/       #   D-01…D-24: decisiones de diseño documentadas
│   └── INFORME_ARBITRO*.md   #   auditorías adversariales del desarrollo
├── audio-merger-native/      # App Windows en Go (código, instalador NSIS, recursos)
│   ├── cmd/ , internal/      #   main, GUI Win32, motor de audio, i18n
│   ├── installer/            #   script NSIS + licencia
│   └── docs/decisions/       #   D-01…D-21: decisiones de diseño documentadas
├── download/                 # Entregables finales (exe + zip + README con hashes)
└── worklog.md                # Bitácora de desarrollo con auditorías del árbitro
```

## Privacidad

Ninguna de las dos versiones hace peticiones de red con tus datos: la web procesa todo en el navegador (WebAssembly) y la app nativa no contiene código de red, telemetría ni registro en Windows.

---

Hecho con Vanilla TypeScript (web) y Go puro (Windows). Interfaz en español.
