/**
 * Reducer puro del componente (FASE 2, gestión de estado — D-03).
 *
 * Estructuras en memoria y complejidad declarada:
 * - `porId: Map<id, AudioTrack>` — acceso O(1) por id estable (UUID).
 * - `orden: string[]` — orden de unión; reorden O(1) sobre el array + O(N) re-append.
 * - El reducer devuelve estado nuevo en toda transición real; las acciones
 *   tardías/de otro job son no-op y devuelven la MISMA referencia (guardas).
 *
 * Invariantes que el reducer hace fallar rápido (MergeError, sin silencios):
 * - ids únicos y presentes en `porId` para todo `orden`.
 * - `orden` es permutación del anterior en REORDENAR.
 * - índices válidos en MOVER.
 */
import { MergeError } from './errors';
import type { AudioTrack, MergeJob, MergeOptions } from './types';
/** Resultado en estado de UI (URL de objeto + datos del blob). */
export interface ResultadoUI {
    readonly url: string;
    readonly blob: Blob;
    readonly name: string;
    readonly mimeType: string;
    readonly size: number;
    readonly durationMs: number | null;
    readonly strategy: 'copy' | 'reencode';
    readonly warnings: readonly {
        code: string;
        message: string;
        params?: Readonly<Record<string, string | number>>;
    }[];
}
export interface EstadoComponente {
    readonly porId: ReadonlyMap<string, AudioTrack>;
    readonly orden: readonly string[];
    readonly opciones: MergeOptions;
    readonly job: MergeJob | null;
    readonly error: MergeError | null;
    readonly resultado: ResultadoUI | null;
    /** Aviso previo pendiente de confirmación (estimación grande). */
    readonly avisoPendiente: readonly {
        tipo: 'tamano' | 'duracion';
        mensajeTecnico: string;
    }[] | null;
}
export declare const estadoInicial: (opciones: MergeOptions) => EstadoComponente;
export type Accion = {
    tipo: 'ANADIR_PISTAS';
    pistas: readonly AudioTrack[];
} | {
    tipo: 'ACTUALIZAR_PISTA';
    id: string;
    cambios: Partial<AudioTrack>;
} | {
    tipo: 'QUITAR_PISTA';
    id: string;
} | {
    tipo: 'MOVER';
    de: number;
    a: number;
} | {
    tipo: 'MOVER_ID';
    id: string;
    delta: number;
} | {
    tipo: 'REORDENAR';
    orden: readonly string[];
} | {
    tipo: 'FIJAR_OPCIONES';
    opciones: MergeOptions;
} | {
    tipo: 'AVISO_PENDIENTE';
    razones: readonly {
        tipo: 'tamano' | 'duracion';
        mensajeTecnico: string;
    }[];
} | {
    tipo: 'LIMPIAR_AVISO';
} | {
    tipo: 'JOB_INICIADO';
    job: MergeJob;
} | {
    tipo: 'JOB_PROGRESO';
    job: MergeJob;
} | {
    tipo: 'JOB_COMPLETADO';
    jobId: string;
    resultado: ResultadoUI;
} | {
    tipo: 'JOB_ERROR';
    jobId: string;
    error: MergeError;
} | {
    tipo: 'JOB_CANCELADO';
} | {
    tipo: 'ERROR';
    error: MergeError;
} | {
    tipo: 'REINICIAR';
} | {
    tipo: 'LIMPIAR_LISTA';
};
export declare function reducer(estado: EstadoComponente, accion: Accion): EstadoComponente;
/** Selector: pistas válidas en orden (excluye invalid — tolerancia a fallos por pista). */
export declare function seleccionarPistasUnibles(estado: EstadoComponente): readonly AudioTrack[];
