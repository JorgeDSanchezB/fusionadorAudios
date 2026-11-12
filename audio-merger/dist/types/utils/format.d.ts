/** Bytes → texto legible: 512 B, 4,5 KB, 350 MB, 1,2 GB. */
export declare function formatearBytes(bytes: number, locale?: string): string;
/** Milisegundos → 0:07 · 3:05 · 1:02:03. `null` no se inventa (decide la UI). */
export declare function formatearDuracion(ms: number | null): string;
/** Fracción 0..1 → «37%». */
export declare function formatearPorcentaje(fraccion: number, locale?: string): string;
/** Fecha para el patrón del nombre de salida: AAAAMMDD-HHMM (local). */
export declare function marcaDeTiempo(d?: Date): string;
