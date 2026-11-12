/**
 * Validación de contenedores de salida (FASE 3, puro): sniffing de cabeceras
 * para detectar uniones silenciosamente incorrectas (D-04). El registro de
 * formatos de salida (FASE 4) referencia estas funciones.
 */

const leerAscii = (b: Uint8Array, desde: number, hasta: number): string =>
  String.fromCharCode(...Array.from(b.slice(desde, hasta)));

/** MP3: etiqueta ID3v2 o sincronía de trama MPEG (versión no reservada, layer ≠ 0). */
export function esMp3(b: Uint8Array): boolean {
  if (b.length < 4) return false;
  if (leerAscii(b, 0, 3) === 'ID3') return true;
  const version = (b[1]! >> 3) & 0x03;
  const layer = (b[1]! >> 1) & 0x03;
  return b[0] === 0xff && (b[1]! & 0xe0) === 0xe0 && version !== 1 && layer !== 0;
}

/** WAV/RIFF: 'RIFF'…'WAVE'. */
export function esWav(b: Uint8Array): boolean {
  if (b.length < 12) return false;
  return leerAscii(b, 0, 4) === 'RIFF' && leerAscii(b, 8, 12) === 'WAVE';
}

/** OGG: 'OggS'. */
export function esOgg(b: Uint8Array): boolean {
  if (b.length < 4) return false;
  return leerAscii(b, 0, 4) === 'OggS';
}

/** FLAC: 'fLaC'. */
export function esFlac(b: Uint8Array): boolean {
  if (b.length < 4) return false;
  return leerAscii(b, 0, 4) === 'fLaC';
}

/** M4A/MP4: 'ftyp' en 4..8. */
export function esM4a(b: Uint8Array): boolean {
  if (b.length < 8) return false;
  return leerAscii(b, 4, 8) === 'ftyp';
}

/** Mapa de sniffers puros por extensión de salida (lo consume el registro F4). */
export const SNIFFERS = {
  mp3: esMp3,
  wav: esWav,
  ogg: esOgg,
  flac: esFlac,
  m4a: esM4a,
} as const;

export type Sniffer = (bytes: Uint8Array) => boolean;
