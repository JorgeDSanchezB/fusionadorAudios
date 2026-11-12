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

export type ResultadoBloque = { readonly info: ProbeInfo } | { readonly sinAudio: true };

export interface LogSonda {
  /** Rutas con bloque Input abierto, con o sin audio. */
  readonly bloques: ReadonlyMap<string, ResultadoBloque>;
  /** true si el log contiene un fallo de apertura de alguna entrada. */
  readonly huboErrorApertura: boolean;
}

const RE_ENTRADA = /^Input #(\d+), .*from '(.+)':/;
const RE_DURACION = /^\s+Duration: (\d+):(\d{2}):(\d{2}\.\d+)(?:, start: [^,]+)?(?:, bitrate: (\d+) kb\/s)?/;
const RE_STREAM_AUDIO = /^\s+Stream #(\d+):\d+.*?: Audio: ([^,]+), (\d+) Hz, ([^,]+)(?:, ([^,]+))?(?:, (\d+) kb\/s)?/;
const RE_ERROR_APERTURA = /(Invalid data found when processing input|Error opening input|moov atom not found|Unknown input format|decoding -52)/i;

function canalesDe(descripcion: string): number {
  const d = descripcion.trim().toLowerCase();
  if (d === 'mono') return 1;
  if (d === 'stereo') return 2;
  if (d === 'quad') return 4;
  // 5.1, 7.1, 6.1… (canales + subwoofer): impresión real de ffmpeg.
  const surround = /^([0-9])\.([0-9])$/.exec(d);
  if (surround) return Number(surround[1]) + Number(surround[2]);
  const porNumero = /(\d+) channels?/.exec(descripcion);
  if (porNumero) return Number(porNumero[1]);
  return 0; // desconocido: la regla de copia lo rechazará (no se inventa)
}

function msDeDuracion(h: string, m: string, s: string): number {
  return Math.round((Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000);
}

/** Parsea el log completo de una ejecución de sonda. Puro. */
export function parsearLogSonda(lineas: readonly string[]): LogSonda {
  const bloques = new Map<string, ResultadoBloque>();
  let huboErrorApertura = false;
  let rutaActual: string | null = null;
  let duracionMs: number | null = null;
  let bitrateDeDuracion: number | null = null;

  for (const linea of lineas) {
    const entrada = RE_ENTRADA.exec(linea);
    if (entrada) {
      rutaActual = entrada[2] ?? null;
      duracionMs = null;
      bitrateDeDuracion = null;
      if (rutaActual !== null && !bloques.has(rutaActual)) {
        bloques.set(rutaActual, { sinAudio: true }); // provisional hasta hallar audio
      }
      continue;
    }
    if (RE_ERROR_APERTURA.test(linea)) {
      huboErrorApertura = true;
      continue;
    }
    if (rutaActual === null) continue;
    const actual = bloques.get(rutaActual);
    if (!actual || 'info' in actual) continue;

    const duracion = RE_DURACION.exec(linea);
    if (duracion) {
      duracionMs = msDeDuracion(duracion[1]!, duracion[2]!, duracion[3]!);
      bitrateDeDuracion = duracion[4] !== undefined ? Number(duracion[4]) : null;
      continue;
    }
    const audio = RE_STREAM_AUDIO.exec(linea);
    if (audio) {
      bloques.set(rutaActual, {
        info: {
          // "mp3 (mp3float)", "aac (LC) (mp4a / …)", "pcm_s16le ([1][0]…)" → primer token.
          codec: (audio[2] ?? '').trim().split(/[\s(]/)[0] ?? '',
          sampleRateHz: Number(audio[3] ?? 0),
          channels: canalesDe(audio[4] ?? ''),
          bitrateKbps: audio[6] !== undefined ? Number(audio[6]) : bitrateDeDuracion,
          durationMs: duracionMs,
        },
      });
    }
  }
  return { bloques, huboErrorApertura };
}

/** Parsea el log de una ejecución de MEDICIÓN (solo Duration de una entrada). */
export function parsearDuracion(lineas: readonly string[]): number | null {
  for (const linea of lineas) {
    const d = RE_DURACION.exec(linea);
    if (d) return msDeDuracion(d[1]!, d[2]!, d[3]!);
  }
  return null;
}

/** Heurística OOM del core (clasificación OUT_OF_MEMORY). */
export function pareceOOM(lineas: readonly string[]): boolean {
  return lineas.some((l) => /out of memory|memory alloc|abort\(OOM\)|Cannot enlarge memory arrays|RangeError/.test(l));
}
