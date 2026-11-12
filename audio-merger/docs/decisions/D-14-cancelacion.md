# D-14 — Cancelación con terminate() y recarga perezosa

- **Problema:** ffmpeg.wasm no interrumpe una ejecución en curso: la única cancelación
  real es `worker.terminate()`, que DESTRUYE el core cargado (32 MB compilados).
- **Decisión:** `cancel()`/`dispose()` hacen terminate del worker + rechazo de todas
  las promesas pendientes (clasificadas como USER_CANCELLED por el orquestador, que
  además comprueba `signal.aborted` tras cada await). El siguiente `merge()` recarga
  el motor: con `engine-base` mismo origen la re-descarga la sirve la caché HTTP del
  navegador; con CDN, los blob URLs ya revocados implican re-descarga (coste declarado).
- **Coste:** tras una cancelación, la siguiente unión paga una recarga (sub-second con
  caché; varios segundos con CDN fría). Alternativa de esperar a que ffmpeg termine y
  descartar el resultado: memoria y CPU desperdiciadas y sin respuesta honesta al
  usuario — descartada.
- **Relación con D-05:** `dispose()` también se invoca tras salidas > `engineRestartAfterBytes`
  para liberar el heap WASM (con advertencia ENGINE_RESTARTED visible).
