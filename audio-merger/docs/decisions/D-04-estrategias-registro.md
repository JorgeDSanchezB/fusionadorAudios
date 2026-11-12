# D-04 — Estrategias de unión por registro (copy / re-encode)

- **Problema:** unir sin re-codificar (`-c copy` vía demuxer concat) es órdenes de
  magnitud más rápido y sin pérdida, pero solo es correcto si TODAS las pistas
  comparten códec/tasa/canales; en caso contrario hay que re-codificar. Y la decisión
  no puede estar cableada si queremos que formatos y opciones nuevos no toquen el
  núcleo (Regla del Carro).
- **Decisión:** las estrategias son funciones puras registradas por clave
  (`concat-copy`, `filter-concat`) que reciben la sonda (metadatos de todas las pistas)
  + opciones + config y devuelven un `MergePlan` (argumentos ffmpeg + nombres internos
  + si exige re-encode). Un selector puro elige estrategia según reglas declaradas en
  config (`copyRule`). Los post-procesos (fundido, silencio, …) también se registran
  por clave y transforman el plan; cada uno declara si fuerza re-codificación.
- **Coste:** una capa de indirección (registro + interfaz de plan) que hay que leer
  para seguir el flujo.
- **Alternativa descartada:** `if(codec === 'mp3') …` dentro del motor: cada formato u
  opción nueva tocaría el núcleo y multiplicaría los casos de prueba; imposibilitaría
  la extensibilidad exigida (añadir FLAC/bitrate/fade sin tocar núcleo).

# Regla de compatibilidad para `-c copy` (declarada, configurable)

Copia solo si TODAS estas condiciones se cumplen:

1. Mismo códec de audio en todas las pistas (por sonda, no por extensión).
2. Misma tasa de muestreo y mismo número de canales.
3. El códec de entrada coincide con el códec nativo del formato de salida solicitado
   (ej.: todas MP3 → salida MP3; WAV/PCM → WAV con misma profundidad).
4. Ningún post-proceso activo exige re-codificación (el fundido, por ejemplo, sí).
5. Casos conocidos de desincronización excluidos de la copia en v1:
   - AAC/M4A de entrada: siempre re-codificación (priming/edit lists del demuxer concat
     producen huecos audibles); además la salida v1 (MP3/WAV) nunca coincide con AAC.
   - Mezcla VBR/CBR en MP3: se permite copiar SOLO si bitrates medios difieren menos
     que la tolerancia configurable; si no, re-codificación (el Xing/VBR intercalado es
     fuente clásica de duraciones erróneas).

# Validación post-unión (defensa contra la unión silenciosamente incorrecta)

Después de cada unión se mide la duración real de la salida (decodificación de
metadatos del propio resultado) y se compara con Σ duraciones de entrada con una
tolerancia configurable (`durationToleranceMs` + proporcional). Si no cuadra: el
resultado se entrega CON advertencia visible (código de advertencia, no error oculto).
Matiz declarado: en MP3 VBR la duración de cabecera Xing es una estimación → posible
falso aviso; la tolerancia proporcional mitiga el ruido y la advertencia es informativa
(no bloquea la descarga).
La re-codificación añade `-map_metadata -1` para no heredar metadata/ID3 del primer
input. Coste: una lectura de metadatos extra (~decenas de ms). Alternativa descartada:
confiar solo en la cabecera del contenedor (no detecta duraciones erróneas).
