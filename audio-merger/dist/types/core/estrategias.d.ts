import type { MergeOptions, ProbeInfo } from './types';
import type { AudioMergerConfig } from '../config/defaults';
import type { PlanificadorUnion } from './merge';
import { type DescriptorFormatoSalida, type PlanEstructural } from '../config/registry';
/** Rutas del protocolo interno del motor (constantes técnicas compartidas con engine/ffmpeg.ts). */
export declare const RUTA_ENTRADA = "/input";
export declare const RUTA_SALIDA = "/output";
/** ¿Es elegible la copia directa con los metadatos de la sonda? (regla D-04) */
export declare function esCopiaElegible(infos: readonly ProbeInfo[], formato: DescriptorFormatoSalida, opciones: Readonly<Record<string, unknown>>, config: Readonly<AudioMergerConfig>): boolean;
/** Resuelve el bitrate efectivo y valida coherencia con el formato de salida. */
export declare function resolverBitrate(opciones: MergeOptions, formato: DescriptorFormatoSalida): number | null;
/** Compila el plan estructural a argumentos ffmpeg (puro). */
export declare function compilarPlan(plan: PlanEstructural, formato: DescriptorFormatoSalida): readonly string[];
/**
 * Planificador inyectable en mergeTracks (FASE 3). Puro: sonda + opciones + config → plan.
 */
export declare const planificarUnion: PlanificadorUnion;
