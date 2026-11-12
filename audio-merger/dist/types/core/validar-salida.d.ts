/**
 * Validación de contenedores de salida (FASE 3, puro): sniffing de cabeceras
 * para detectar uniones silenciosamente incorrectas (D-04). El registro de
 * formatos de salida (FASE 4) referencia estas funciones.
 */
/** MP3: etiqueta ID3v2 o sincronía de trama MPEG (versión no reservada, layer ≠ 0). */
export declare function esMp3(b: Uint8Array): boolean;
/** WAV/RIFF: 'RIFF'…'WAVE'. */
export declare function esWav(b: Uint8Array): boolean;
/** OGG: 'OggS'. */
export declare function esOgg(b: Uint8Array): boolean;
/** FLAC: 'fLaC'. */
export declare function esFlac(b: Uint8Array): boolean;
/** M4A/MP4: 'ftyp' en 4..8. */
export declare function esM4a(b: Uint8Array): boolean;
/** Mapa de sniffers puros por extensión de salida (lo consume el registro F4). */
export declare const SNIFFERS: {
    readonly mp3: typeof esMp3;
    readonly wav: typeof esWav;
    readonly ogg: typeof esOgg;
    readonly flac: typeof esFlac;
    readonly m4a: typeof esM4a;
};
export type Sniffer = (bytes: Uint8Array) => boolean;
