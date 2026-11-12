# D-05 — WORKERFS para entradas; salida en MEMFS con cadena de memoria declarada

- **Problema:** unir horas de podcast son GB de entrada. `ffmpeg.writeFile` copiaría
  cada archivo a MEMFS (RAM del heap WASM) → OOM garantizado.
- **Decisión:** montar los `File` del usuario con WORKERFS en el worker
  (`FS.mount(WORKERFS, { files }, '/input')`): el core lee del disco virtual por
  slices sin cargar el archivo entero. WORKERFS está compilado dentro de
  `@ffmpeg/core` 0.12.10 (verificado por inspección: 21 ocurrencias de `WORKERFS` en
  el pegamento JS `ffmpeg-core.js` y registrado en `FS.filesystems`; reproducible:
  `grep -ao WORKERFS node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js | wc -l`).
- **Coste / cadena de memoria de la SALIDA (declarada):** la salida vive en MEMFS
  (heap WASM) y se lee con `FS.readFile` → copia JS `Uint8Array` → pico en el worker
  ≈ 2×S. La transferencia a la página usa `postMessage` con transferencia de buffer
  (sin copia adicional); tras leer se hace `unlink` del archivo de salida; tras
  salidas mayores que `engineRestartAfterBytes` (config, 1 GB por defecto) se hace
  `terminate()` del motor para liberar el heap WASM (que no se devuelve solo).
  Límite práctico de salida ~1 GB en escritorio y ~400–500 MB en móvil, también por la
  asignación contigua de `ArrayBuffer` (1–2 GB según motor); el umbral de advertencia
  por defecto (`warnOutputBytes`, 350 MB) se sitúa por debajo del techo móvil
  precisamente para avisar antes en dispositivos con menos memoria.
- **Alternativa descartada:** `fetchFile`/`writeFile` de @ffmpeg/util para cada
  entrada — O(duración) en RAM, inviable para el caso podcast (requisito explícito).

# Comportamiento sin WORKERFS (excepcional)

Si el core no registrara WORKERFS: el motor lo informa (`WORKERFS_UNAVAILABLE`), la
unión sigue siendo posible por `writeFile` pero el límite práctico pasa a ser la suma
de entradas + salida en RAM; la UI lo comunica antes de empezar (no se degrada en
silencio). No es el caso del core 0.12.10 verificado.
