/**
 * Código fuente del worker del motor (D-02/D-13).
 *
 * POR QUÉ UNA CADENA: el worker nace de una URL blob generada en runtime, idéntica
 * en las builds ESM y UMD. Así el bundle NO depende de cómo cada bundler resuelve
 * `new Worker(new URL(...))` (fallos conocidos de classWorkerURL en UMD) y no
 * empaquetamos @ffmpeg/ffmpeg: hablamos el protocolo del core directamente.
 *
 * El worker es CLÁSICO: `importScripts(coreURL)` con el core UMD oficial
 * (@ffmpeg/core). El core ST no requiere COOP/COEP; el MT se pasa por el truco
 * del fragmento `#` (wasmURL/workerURL) que usa el propio core (mismo mecanismo
 * que @ffmpeg/ffmpeg 0.12, verificado en sus fuentes).
 */
export declare const CODIGO_WORKER: string;
