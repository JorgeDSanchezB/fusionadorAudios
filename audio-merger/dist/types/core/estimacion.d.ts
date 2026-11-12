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
export declare function estimarSalida(pistas: readonly Pick<AudioTrack, 'size' | 'durationMs'>[], estrategia: 'copy' | 'reencode', bytesPorSegundo: number | null): EstimacionSalida;
export interface RazonAviso {
    readonly tipo: 'tamano' | 'duracion';
    readonly mensajeTecnico: string;
}
/** Decide si la estimación dispara el diálogo de advertencia previa. */
export declare function razonesDeAviso(estimacion: EstimacionSalida, limits: LimitsConfig): readonly RazonAviso[];
/** Comprueba los límites DUROS pre-unión (Σ entradas y Σ duración si está fijado). */
export declare function erroresDeLimites(pistas: readonly Pick<AudioTrack, 'size' | 'durationMs' | 'name'>[], limits: LimitsConfig): readonly MergeError[];
