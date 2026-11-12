/**
 * Estimación previa de la salida (FASE 2): alimenta el aviso de "unión grande"
 * ANTES de empezar (requisito del caso podcast). Pura y conservadora:
 * si falta un dato, lo declara (parcial) en vez de inventarlo.
 */
import { MergeError } from './errors';
import type { AudioTrack } from './types';
import type { LimitsConfig } from '../config/defaults';

export interface EstimacionSalida {
  /** Bytes estimados de la salida; null si no hay forma responsable de estimar. */
  readonly bytes: number | null;
  /** Σ duraciones conocidas; null si alguna pista no declara duración. */
  readonly duracionMs: number | null;
  /** true → la estimación se hizo con datos parciales (aviso DURATION_ESTIMATED). */
  readonly parcial: boolean;
}

/**
 * Estima el tamaño de salida.
 * - copy: Σ tamaños de entrada + ~1% de overhead de contenedor.
 * - reencode: duración × bytesPorSegundo del perfil de salida (+3% de contenedor);
 *   si la duración es parcial se usa la suma conocida y se marca `parcial`.
 * `bytesPorSegundo` lo calcula el llamador a partir del formato de salida
 * (MP3: bitrate/8; WAV: sampleRate × canales × 2) — esta función no conoce formatos.
 */
export function estimarSalida(
  pistas: readonly Pick<AudioTrack, 'size' | 'durationMs'>[],
  estrategia: 'copy' | 'reencode',
  bytesPorSegundo: number | null,
): EstimacionSalida {
  let duracionConocida = 0;
  let duracionParcial = false;
  let bytesEntrada = 0;
  for (const p of pistas) {
    bytesEntrada += p.size;
    if (p.durationMs === null) duracionParcial = true;
    else duracionConocida += p.durationMs;
  }
  const duracionMs = duracionParcial ? (duracionConocida > 0 ? duracionConocida : null) : duracionConocida;

  if (estrategia === 'copy') {
    // Copy preserva los streams: cota ≈ suma de entradas + contenedor mínimo.
    return { bytes: bytesEntrada > 0 ? Math.round(bytesEntrada * 1.01) : null, duracionMs, parcial: duracionParcial };
  }
  if (duracionMs === null || bytesPorSegundo === null || bytesPorSegundo <= 0) {
    return { bytes: null, duracionMs, parcial: true };
  }
  const bytes = Math.round((duracionMs / 1000) * bytesPorSegundo * 1.03);
  return { bytes, duracionMs, parcial: duracionParcial };
}

export interface RazonAviso {
  readonly tipo: 'tamano' | 'duracion';
  readonly mensajeTecnico: string;
}

/** Decide si la estimación dispara el diálogo de advertencia previa. */
export function razonesDeAviso(estimacion: EstimacionSalida, limits: LimitsConfig): readonly RazonAviso[] {
  const razones: RazonAviso[] = [];
  if (estimacion.bytes !== null && estimacion.bytes >= limits.warnOutputBytes) {
    razones.push({ tipo: 'tamano', mensajeTecnico: `salida estimada ≥ ${limits.warnOutputBytes} B` });
  }
  if (limits.warnDurationMs !== null && estimacion.duracionMs !== null && estimacion.duracionMs >= limits.warnDurationMs) {
    razones.push({ tipo: 'duracion', mensajeTecnico: `duración ≥ ${limits.warnDurationMs} ms` });
  }
  return razones;
}

/** Comprueba los límites DUROS pre-unión (Σ entradas y Σ duración si está fijado). */
export function erroresDeLimites(
  pistas: readonly Pick<AudioTrack, 'size' | 'durationMs' | 'name'>[],
  limits: LimitsConfig,
): readonly MergeError[] {
  const errores: MergeError[] = [];
  const totalBytes = pistas.reduce((s, p) => s + p.size, 0);
  if (totalBytes > limits.maxTotalBytes) {
    errores.push(new MergeError({
      code: 'TOTAL_TOO_LARGE',
      message: `Σ entradas ${totalBytes} B > máximo ${limits.maxTotalBytes} B`,
      details: { total: totalBytes, maximo: limits.maxTotalBytes },
    }));
  }
  if (limits.maxDurationMs !== null) {
    const duraciones = pistas.map((p) => p.durationMs);
    if (duraciones.every((d) => d !== null)) {
      const total = duraciones.reduce((s, d) => s + (d ?? 0), 0);
      if (total > limits.maxDurationMs) {
        errores.push(new MergeError({
          code: 'DURATION_TOO_LONG',
          message: `Σ duraciones ${total} ms > máximo ${limits.maxDurationMs} ms`,
          details: { total, maximo: limits.maxDurationMs },
        }));
      }
    }
    // Si alguna duración es desconocida, el límite duro NO se aplica (no se bloquea
    // por falta de dato); el aviso previo sigue cubriendo el caso.
  }
  return errores;
}
