/**
 * Parser del log de sonda de ffmpeg (D-09) — PURO y testeado con líneas REALES
 * del ffmpeg 7.1.5 sobre los fixtures (ver tests/unit/probe.test.ts).
 *
 * La sonda ejecuta UNA sola pasada: ffmpeg -hide_banner -i p1 -i p2 … -t 0.05 -f null -
 * → cada entrada abierta imprime su bloque "Input #N … Duration … Stream … Audio: …".
 * Clasificación (la completa el motor con las rutas esperadas):
 *  - bloque Input con stream de audio → ProbeInfo
 *  - bloque Input SIN stream de audio → sinAudio (UNSUPPORTED_FORMAT en el motor)
 *  - sin bloque Input (no se pudo abrir) → ausente (CORRUPT_FILE en el motor)
 */
import type { ProbeInfo } from '../core/types';
export type ResultadoBloque = {
    readonly info: ProbeInfo;
} | {
    readonly sinAudio: true;
};
export interface LogSonda {
    /** Rutas con bloque Input abierto, con o sin audio. */
    readonly bloques: ReadonlyMap<string, ResultadoBloque>;
    /** true si el log contiene un fallo de apertura de alguna entrada. */
    readonly huboErrorApertura: boolean;
}
/** Parsea el log completo de una ejecución de sonda. Puro. */
export declare function parsearLogSonda(lineas: readonly string[]): LogSonda;
/** Parsea el log de una ejecución de MEDICIÓN (solo Duration de una entrada). */
export declare function parsearDuracion(lineas: readonly string[]): number | null;
/** Heurística OOM del core (clasificación OUT_OF_MEMORY). */
export declare function pareceOOM(lineas: readonly string[]): boolean;
