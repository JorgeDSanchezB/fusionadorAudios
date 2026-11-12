# D-05 — Salida MP3 solo en «modo copia» (concatenación de frames)

## Problema que resuelve
Ofrecer salida MP3 sin incrustar un codificador C (LAME) imposible de cruzar-compilar
aquí sin MinGW, y sin usar encoders Go no mantenidos.

## Decisión
- Salida WAV (PCM 16 bits): SIEMPRE disponible; convierte lo que haga falta.
- Salida MP3: concatenación a nivel de frame MPEG («como -c copy» del diseño web):
  se requiere que TODAS las entradas sean MP3 con la misma versión MPEG, layer,
  tasa de muestreo y modo de canal (el bitrate puede variar por frame, VBR admitido).
  Se eliminan los tags ID3 de origen y no se escriben tags de salida.

## Coste introducido
- MP3 no disponible para mezclas (p. ej. WAV+MP3 o M4A): la GUI lo indica y el motor
  devuelve PARAM_MISMATCH con mensaje accionable.

## Alternativas descartadas
- **Portar Shine/LAME a Go**: miles de líneas sin posibilidad de prueba aquí — riesgo
  inaceptable.
- **Ofrecer solo WAV**: pierde el caso de uso más común (unir MP3).
