/**
 * Helpers puros sobre pistas (FASE 2/5): validación de entradas, admisión bajo
 * límites, totales y reorden. Sin DOM ni motor → testeable en Node.
 */
import { MergeError } from './errors';
import type { AudioTrack } from './types';
import type { LimitsConfig } from '../config/defaults';
/** Descriptor mínimo de formato de entrada quenecesita la validación (registro en FASE 4). */
export interface DescriptorFormatoEntrada {
    readonly extensions: readonly string[];
    readonly mimeTypes: readonly string[];
}
export interface ArchivoDeEntrada {
    readonly name: string;
    readonly size: number;
    readonly type: string;
}
export declare function extensionDe(nombre: string): string;
/**
 * Extensión CANÓNICA de una entrada (planificador y motor usan ESTA función:
 * evita divergencias de nombres internos). Sin extensión útil → 'bin'.
 */
export declare function extensionSegura(nombre: string): string;
/**
 * Valida UN archivo contra formatos y límites. Devuelve el error clasificado o null.
 * Distingue: formato no registrado / demasiado grande / sin nombre utilizable.
 */
export declare function validarArchivoEntrada(archivo: ArchivoDeEntrada, formatos: readonly DescriptorFormatoEntrada[], limits: LimitsConfig): MergeError | null;
export interface AdmisionPistas {
    readonly admitidas: readonly AudioTrack[];
    readonly rechazadas: readonly {
        readonly pista: AudioTrack;
        readonly error: MergeError;
    }[];
}
/**
 * Separa pistas nuevas en admitidas/rechazadas según maxTracks y maxTotalBytes
 * (la suma incluye las YA en lista). Orden de llegada preservado.
 */
export declare function seleccionarAdmisibles(nuevas: readonly AudioTrack[], pistasActuales: readonly AudioTrack[], limits: LimitsConfig): AdmisionPistas;
/** Totales de la lista: duración null si ALGUNA es desconocida (no se inventa). */
export declare function totalesDeLista(pistas: readonly AudioTrack[]): {
    duracionMs: number | null;
    bytes: number;
};
/** Reorden puro por índices (0-based). Lanza INVALID_ORDER si los índices no cuadran. */
export declare function reordenarLista<T>(lista: readonly T[], de: number, a: number): readonly T[];
/** Mueve una pista por id un delta de posiciones (botones ↑/↓ y API moveTrack). */
export declare function moverPorId(orden: readonly string[], id: string, delta: number): readonly string[];
/** Comprueba que un orden nuevo es una permutación válida del actual. */
export declare function esPermutacionValida(actual: readonly string[], propuesta: readonly string[], porId: ReadonlyMap<string, unknown>): boolean;
/** Pistas VÁLIDAS en orden (las invalid se excluyen de la unión). */
export declare function pistasUnibles(porId: ReadonlyMap<string, AudioTrack>, orden: readonly string[]): readonly AudioTrack[];
/**
 * Invariante del mínimo de pistas (FASE 2, aplicado antes de unir por la orquestación
 * y por `merge()` público): NOT_ENOUGH_TRACKS o null si se cumple.
 */
export declare function comprobarMinimoPistas(nUnibles: number, limits: LimitsConfig): MergeError | null;
