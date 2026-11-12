/**
 * Modelado de datos del core (FASE 2).
 *
 * Principios:
 * - Toda entidad lleva `id` (UUID generado, JAMÁS el índice de lista) y `createdAt`.
 * - Los campos opcionales se modelan como `| null` explícito (valor ausente conocido),
 *   distinguible de `undefined` (campo aún no calculado) según la FASE 5.
 * - Estructuras en memoria: `Map<id, AudioTrack>` + array ordenado de ids (O(1) por
 *   id, orden estable); complejidades declaradas en docs/data-model.md.
 * - Sin persistencia en v1: no hay migraciones (declarado en docs/data-model.md).
 */
import type { ErrorCode } from './errors';

/** Base de toda entidad del dominio. */
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: number;
}

/** Estado de una pista tras su validación inicial. */
export type TrackStatus =
  | 'ready'      // válida y lista para unir
  | 'analyzing'  // leyendo metadatos (duración) de forma asíncrona
  | 'invalid';   // rechazada (formato/tamaño/corrupta) — ver `errorCode`

/** Parámetros de audio obtenidos por la sonda del motor (FASE 4). */
export interface ProbeInfo {
  /** Códec ffmpeg detectado por la sonda, p. ej. 'mp3', 'pcm_s16le', 'aac', 'flac'. */
  readonly codec: string;
  readonly sampleRateHz: number;
  readonly channels: number;
  /** Bitrate medio declarado; `null` si desconocido (VBR sin estimar). */
  readonly bitrateKbps: number | null;
  /** Duración medida por la sonda; `null` si el contenedor no la declara. */
  readonly durationMs: number | null;
}

/** Una pista de audio cargada por el usuario. */
export interface AudioTrack extends BaseEntity {
  /** Nombre visible (el del archivo). Puede venir vacío: la UI muestra «sin nombre». */
  readonly name: string;
  readonly size: number;
  readonly mimeType: string;
  /** Extensión en minúsculas sin punto (deducida del nombre o del MIME). */
  readonly extension: string;
  /**
   * Duración conocida por metadatos de navegador; `null` = desconocida (no se inventa).
   * La sonda del motor la sustituye por la medida real durante la unión.
   */
  readonly durationMs: number | null;
  readonly status: TrackStatus;
  /** Presente solo si `status === 'invalid'` o si la pista falló al analizarse. */
  readonly errorCode?: ErrorCode;
  /** Presente solo tras la sonda del motor (FASE 4). */
  readonly probed: ProbeInfo | null;
}

/** Estado de un job de unión. */
export type JobStatus = 'running' | 'completed' | 'error' | 'cancelled';

/** Etapas de un job (para progreso y textos de estado). */
export type MergeStage =
  | 'loading-engine'
  | 'probing'
  | 'merging'
  | 'validating';

/** Un trabajo de unión (una sola instancia activa por componente — política de cola). */
export interface MergeJob extends BaseEntity {
  /** Orden EXACTO de unión (ids de pistas válidas, en orden). */
  readonly trackIds: readonly string[];
  readonly outputFormat: string;
  readonly bitrateKbps: number | null;
  readonly status: JobStatus;
  /** 0..1, agregado por etapas con pesos de config (`engine.progressWeights`). */
  readonly progress: number;
  readonly stage: MergeStage;
  readonly errorCode?: ErrorCode;
  readonly startedAt: number;
  readonly finishedAt?: number;
}

/**
 * Opciones de unión. Los campos fijos son los que la FASE 3 expone como
 * atributos/propiedades; el índice adicional permite opciones registradas por
 * terceros (Regla del Carro) validadas contra el registro (core/validation.ts).
 */
export interface MergeOptions {
  format: string;
  bitrateKbps: number | null;
  fadeMs: number;
  readonly [clave: string]: unknown;
}

/** Advertencias no fatales del resultado (visibles, nunca silenciadas). */
export const CODIGOS_AVISO = [
  'DURATION_MISMATCH',   // duración de salida ≠ Σ entradas (tolerancia config)
  'DURATION_ESTIMATED',  // estimación previa hecha con datos parciales
  'ENGINE_RESTARTED',    // el motor se reinició tras una salida gigante (memoria)
] as const;

export type WarningCode = (typeof CODIGOS_AVISO)[number];

export interface MergeWarning {
  readonly code: WarningCode;
  readonly message: string;
  /** Parámetros de interpolación para la plantilla i18n del aviso (si aplica). */
  readonly params?: Readonly<Record<string, string | number>>;
}

/** Resultado de una unión correcta. */
export interface MergeOutput {
  readonly blob: Blob;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly durationMs: number | null;
  readonly strategy: 'copy' | 'reencode';
  readonly warnings: readonly MergeWarning[];
}

/**
 * Plan de ejecución producido por una estrategia (FASE 4) y consumido por el motor.
 * Datos puros: las estrategias son testeables sin WASM.
 */
export interface MergePlan {
  readonly strategy: 'copy' | 'reencode';
  /** Argumentos ffmpeg completos (sin el binario). */
  readonly args: readonly string[];
  /** Nombre interno del archivo de salida en el FS del motor. */
  readonly outputInternalName: string;
  /** Contenido del archivo de lista del demuxer concat (solo copy); lo escribe el motor. */
  readonly listaConcat?: readonly string[];
  readonly outputMimeType: string;
  readonly outputExtension: string;
  /** Duración esperada de salida en ms si es conocible (Σ entradas); si no, null. */
  readonly expectedDurationMs: number | null;
}

/** Contexto de progreso reportado por el orquestador. */
export interface MergeProgress {
  readonly stage: MergeStage;
  /** 0..1 global del job, monotónico por contrato. */
  readonly progress: number;
  /** Texto técnico de etapa; la UI lo traduce con i18n. */
  readonly detail?: string;
}
