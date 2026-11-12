/**
 * Orquestador de la unión (FASE 3): `mergeTracks(entradas, opciones, ctx)`.
 *
 * Contrato del core (puro salvo el motor inyectado):
 * - Cancelación vía `ctx.signal` (AbortSignal): cancela el motor y rechaza USER_CANCELLED.
 * - Progreso vía `ctx.onProgress` con etapas ponderadas por `config.engine.progressWeights`.
 * - El motor se INYECTA (interfaz `MotorUnion`): el core es testeable con motor simulado;
 *   el motor real (ffmpeg.wasm) se prueba en navegador (D-12).
 * - Planificación inyectada (`PlanificadorUnion`): FASE 4 aporta la implementación real
 *   (estrategias copy/re-encode + post-procesos); aquí solo se consume el plan.
 * - Tolerancia a fallos clasificada: precondiciones, sonda por pista, ejecución,
 *   validación de contenedor, validación de duración (advertencia visible, no oculta).
 */
import { MergeError } from './errors';
import type { MergeOptions, MergeOutput, MergePlan, MergeProgress, ProbeInfo } from './types';
import type { AudioMergerConfig } from '../config/defaults';
import { type OptionSchema } from './validation';
/** Entrada de unión: el blob del archivo del usuario con su id estable. */
export interface EntradaUnion {
    readonly id: string;
    readonly name: string;
    readonly blob: Blob;
}
/** Resultado de sonda por entrada: metadatos o error clasificado de ESA pista. */
export type ResultadoSonda = {
    readonly id: string;
    readonly info: ProbeInfo;
} | {
    readonly id: string;
    readonly error: MergeError;
};
/** Motor de unión (lo implementa engine/ en FASE 4; aquí solo el contrato). */
export interface MotorUnion {
    /** Carga el motor bajo demanda. `onDescarga` informa del avance de la descarga (0..1). */
    ensureLoaded(onDescarga?: (fraccion: number) => void): Promise<void>;
    /** Sonda de TODAS las entradas (una sola ejecución en el motor real — D-09). */
    sondear(entradas: readonly EntradaUnion[]): Promise<readonly ResultadoSonda[]>;
    /** Ejecuta el plan y devuelve los bytes de salida. `fraccion` 0..1 de la ejecución. */
    ejecutar(plan: MergePlan, entradas: readonly EntradaUnion[], onFraccion?: (fraccion: number) => void): Promise<Uint8Array>;
    /** Mide la duración real de la salida (para la validación post-unión). */
    medirDuracion(blob: Blob): Promise<number | null>;
    /** Cancela la operación en curso (terminate). La promesa en vuelo debe rechazar. */
    cancelar(): void;
    /** Libera el motor (terminate + limpieza de object URLs del core). */
    dispose(): void;
}
/** Planificador: produce el plan de ejecución a partir de la sonda y las opciones. */
export type PlanificadorUnion = (sonda: readonly {
    id: string;
    info: ProbeInfo;
}[], entradas: readonly EntradaUnion[], opciones: MergeOptions, config: Readonly<AudioMergerConfig>) => MergePlan;
/** Validador de contenedor de salida inyectado (registro F4 lo aporta). */
export type ValidadorContenedor = (bytes: Uint8Array, formatoSalida: string) => boolean;
export interface ContextoUnion {
    readonly config: Readonly<AudioMergerConfig>;
    readonly motor: MotorUnion;
    readonly planificador: PlanificadorUnion;
    readonly validadorContenedor: ValidadorContenedor;
    readonly esquemasOpciones: readonly OptionSchema[];
    readonly signal?: AbortSignal;
    readonly onProgress?: (p: MergeProgress) => void;
}
export declare function mergeTracks(entradas: readonly EntradaUnion[], opcionesBrutas: MergeOptions, ctx: ContextoUnion): Promise<MergeOutput>;
