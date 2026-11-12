/**
 * Contrato de eventos del componente (FASE 3). Todos con prefijo `audiomerger:`,
 * `bubbles: true` y `composed: true` para cruzar el Shadow DOM.
 * Los nombres son constantes (contrato público estable) y los payloads, tipos.
 */
import type { AudioTrack, MergeJob, MergeOptions, MergeProgress, MergeStage } from './types';
import type { ErrorCode, ErrorDetails } from './errors';

export const EVENTOS = {
  pistaAnadida: 'audiomerger:track-added',
  pistaQuitada: 'audiomerger:track-removed',
  reordenado: 'audiomerger:reordered',
  unionIniciada: 'audiomerger:merge-started',
  progresoUnion: 'audiomerger:merge-progress',
  unionCompletada: 'audiomerger:merge-completed',
  error: 'audiomerger:error',
  cancelada: 'audiomerger:cancelled',
  opcionesCambiadas: 'audiomerger:options-changed',
} as const;

export type NombreEvento = (typeof EVENTOS)[keyof typeof EVENTOS];

export interface DetallePistaAnadida {
  readonly pista: AudioTrack;
}

export interface DetallePistaQuitada {
  readonly id: string;
  readonly pista: AudioTrack;
}

export interface DetalleReordenado {
  /** Orden completo tras el cambio (ids de pista). */
  readonly orden: readonly string[];
  readonly de: number;
  readonly a: number;
  readonly origen: 'arrastrar' | 'boton' | 'api';
}

export interface DetalleUnionIniciada {
  readonly job: MergeJob;
}

export interface DetalleProgresoUnion extends MergeProgress {
  readonly stage: MergeStage;
}

export interface DetalleAdvertencia {
  readonly code: string;
  readonly message: string;
  /** Parámetros de interpolación del aviso (contrato del resultado). */
  readonly params?: Readonly<Record<string, string | number>>;
}

export interface DetalleUnionCompletada {
  readonly blob: Blob;
  /** URL de objeto lista para descargar/preescucha (el componente la gestiona). */
  readonly url: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly durationMs: number | null;
  readonly strategy: 'copy' | 'reencode';
  readonly warnings: readonly DetalleAdvertencia[];
}

export interface DetalleError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details: ErrorDetails;
}

export interface DetalleCancelada {
  readonly jobId: string | null;
}

export interface DetalleOpcionesCambiadas {
  readonly opciones: MergeOptions;
}
