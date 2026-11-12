# D-06 — Formato interno float32 y normalización a los parámetros de la 1.ª pista

## Problema que resuelve
Fusionar entradas heterogéneas (44,1/48 kHz, mono/estéreo, profundidades distintas)
sin exigir al usuario que entienda de parámetros.

## Decisión
- Toda decodificación pasa a float32 entrelazado.
- El destino toma la tasa y canales de la PRIMERA pista; el resto se convierte:
  - canales: mono→estéreo duplicando; estéreo→mono promediando; >2 canales se
    reduce tomando los dos primeros (o promedio a mono).
  - remuestreo: interpolación lineal (calidad estándar, documentada).
- Escritura WAV: int16 con dithering nulo (truncamiento redondeado).

## Coste introducido
- El remuestreo lineal al BAJAR tasa puede producir aliasing leve (declarado).
- Conversión de canales «simple» (documentada) frente a matrices profesionales.

## Alternativas descartadas
- **Exigir homogeneidad y fallar**: UX mala para un usuario final.
- **Resampler poli-fase de alta fidelidad**: overkill para la herramienta y más
  superficie de error.
