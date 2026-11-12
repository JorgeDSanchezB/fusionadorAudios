/**
 * Lectura de duración por metadatos del navegador (D-10, FASE 5):
 * un <audio> efímero parsea SOLO cabeceras (loadedmetadata), sin decodificar.
 * Si el navegador no declara duración (FLAC sin SEEKTABLE, OGG de flujo) o el
 * entorno no soporta object URLs: null declarado — la UI muestra «duración
 * desconocida», nunca una cifra inventada. NUNCA rechaza (la pista sigue unible).
 */
export declare function leerDuracion(blob: Blob): Promise<number | null>;
