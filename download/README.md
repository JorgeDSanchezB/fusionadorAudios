# Fusionador de Audio 1.0.3 — Descargas

Dos formas de obtener el programa (elige la que prefieras):

| Archivo | Qué es |
|---|---|
| `FusionadorDeAudio-Setup-1.0.3-x64.exe` | Instalador (NSIS, español, por usuario, sin permisos de administrador) |
| `FusionadorDeAudio-Portable-1.0.3-x64.zip` | Versión portable: descomprimir y ejecutar, sin instalación |

> Nota: los archivos fueron recompilados el 29-10-2026 conservando la tabla
> de símbolos del binario (mejor análisis por parte de los antivirus).
> Si descargaste una copia anterior, vuelve a descargar estos.

---

## «Me estás poniendo un virus?» — NO. Esto es lo que ocurre realmente

Tu antivirus (Kaspersky) reportó:

```
Nombre: VHO:Trojan.Win64.Convagent.gen
Precisión: Análisis heurístico
```

Dos detalles de ese propio reporte demuestran que **no es un virus detectado,
sino una sospecha automática**:

1. El prefijo **`VHO:`** significa en la nomenclatura de Kaspersky
   *«veredicto basado en análisis heurístico»*: el archivo **no coincide con
   ningún virus conocido** en su base de datos; un algoritmo estimó que
   "se parece a" una familia genérica (`.gen`).
2. Los heurísticos penalizan exactamente las tres características de este
   programa: **sin firma digital** (no hay certificado, cuesta dinero),
   **recién compilado** (tu equipo es el único del mundo con ese hash: cero
   reputación) y **binario Go con resolución dinámica de funciones de
   Windows** (patrón que se parece superficialmente a cómo el malware oculta
   sus llamadas, aunque aquí lo usa una GUI legítima).

**Prueba de integridad**: el MD5 del archivo que borró Kaspersky
(`AD0B94B14B1713FE2FD64EC189398FE4`) coincide **byte a byte** con el exe que
generó la compilación de este proyecto — nadie modificó el archivo en el
camino. La auditoría del código fuente (4.472 líneas legibles, incluidas en
el proyecto) confirma: **cero código de red** (no puede conectarse a
internet), **cero ejecución de programas externos**, **cero acceso al
registro**. Sus únicas dependencias son tres decodificadores de audio de
código abierto (go-mp3, oggvorbis, flac).

---

## Cómo desbloquearlo en Kaspersky (pasos exactos)

### Paso 1 — Añade la exclusión ANTES de descomprimir

1. Abre Kaspersky → **Configuración** (engranaje) → **Amenazas y
   exclusiones** (o "Protección" → "Amenazas y exclusiones").
2. En **Exclusiones**, pulsa **Administrar exclusiones** → **Agregar**.
3. Indica la carpeta donde vas a descomprimir el programa
   (p. ej. `D:\PROGRAMAS\FusionadorDeAudio`) o directamente el archivo
   `FusionadorDeAudio.exe`. En "Objeto" marca la ruta; puedes dejar el
   resto por defecto. Guarda.
4. **Ahora sí**: descomprime de nuevo el ZIP (o ejecuta el instalador).
   El .exe dentro del ZIP sigue intacto — Kaspersky solo borró la copia
   extraída.

⚠️ Extrae en una **carpeta local** (p. ej. `D:\PROGRAMAS\`), no dentro de
**OneDrive** (como el Escritorio sincronizado): OneDrive re-escanea los
archivos y vuelve a disparar el antivirus.

### Paso 2 (recomendado) — Reporta el falso positivo a Kaspersky

Entra en **https://opentip.kaspersky.com** y sube el `FusionadorDeAudio.exe`
(mismo sitio donde se descomprime). Los analistas de Kaspersky lo revisan
manualmente y, si es limpio (lo es), lo añaden a la lista blanca en las
actualizaciones de bases de datos: eso arregla el problema para siempre y
en todos los equipos. Suele tardar unos días.

---

## Si usas Windows Defender en vez de Kaspersky

1. «Seguridad de Windows» → «Protección contra virus y amenazas» →
   **«Historial de protección»**.
2. Busca la detección sobre FusionadorDeAudio (p. ej.
   `Trojan:Win32/Wacatac...!ml`) → **«Permitir»**.
3. Vuelve a descargar el archivo y ejecútalo. Si no aparece en el
   historial: «Administrar la configuración» → **«Exclusiones»** → añade la
   carpeta.

---

## Verificación de integridad (opcional)

Compara con PowerShell (`Get-FileHash .\<archivo>`):

```
SHA-256
4c42415ccaa2f3a1ee70430d20f350ee5e753e7ec23a835b2ba8739b9781387e  FusionadorDeAudio-Setup-1.0.3-x64.exe
902a129a7f8063780f03db044375861c8b64e38c5a4f09f02374c51328d95f4a  FusionadorDeAudio-Portable-1.0.3-x64.zip

MD5 del exe dentro del ZIP (para OpenTip / comparación directa):
49dfa5a89ceac5b2d4b0b39c111fb718  FusionadorDeAudio.exe
```

## Novedades de la 1.0.3

- **Lista de pistas visible**: cada audio añadido aparece en la lista con su
  nombre y queda resaltado al cargar.
- **Orden elegible**: arrastra las pistas dentro de la lista (con marca de
  inserción), botones «Subir»/«Bajar», Alt+↑/Alt+↓; Supr quita la
  seleccionada. La fusión sigue exactamente el orden de la lista.
- Entrada WAV, MP3, OGG (Vorbis), FLAC; salida WAV (PCM 16 bits) siempre y
  MP3 en modo copia si todas las pistas son MP3 compatibles.
- Todo se procesa en local: nada se sube a internet.

## Nota de honestidad

El programa se compila y se testea en Linux (los tests usan muestras de
audio reales); **no hay Windows real en el entorno de compilación**, por lo
que la ejecución final en tu equipo es la verificación definitiva. Sin
certificado de firma (de pago) es imposible garantizar cero avisos de
antivirus; los pasos de arriba cubren el desbloqueo, y el reporte en
OpenTip es la vía definitiva para que Kaspersky lo whitelistee.
