# D-13 — Escritura atómica del resultado (temporal + renombrado)

## Problema que resuelve
No dejar a medias el archivo de salida si la fusión falla, se cancela o el disco se
llena.

## Decisión
La fusión escribe a un archivo temporal junto al destino y al terminar correctamente
hace rename() atómico. Si algo falla, el temporal se borra y el destino nunca existe
a medias.

## Coste introducido
- Doble manejo de ruta (temporal/definitivo).

## Alternativas descartadas
- Escribir directo al destino: un corte deja un WAV/MP3 corrupto con el nombre bueno.
