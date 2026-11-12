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
import { esPermutacionValida, moverPorId, reordenarLista } from './tracks';
import { ordenValido } from './validation';
import type { AudioTrack, MergeJob, MergeOptions, MergeOutput } from './types';

/** Resultado en estado de UI (URL de objeto + datos del blob). */
export interface ResultadoUI {
  readonly url: string;
  readonly blob: Blob;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly durationMs: number | null;
  readonly strategy: 'copy' | 'reencode';
  readonly warnings: readonly { code: string; message: string; params?: Readonly<Record<string, string | number>> }[];
}

export interface EstadoComponente {
  readonly porId: ReadonlyMap<string, AudioTrack>;
  readonly orden: readonly string[];
  readonly opciones: MergeOptions;
  readonly job: MergeJob | null;
  readonly error: MergeError | null;
  readonly resultado: ResultadoUI | null;
  /** Aviso previo pendiente de confirmación (estimación grande). */
  readonly avisoPendiente: readonly { tipo: 'tamano' | 'duracion'; mensajeTecnico: string }[] | null;
}

export const estadoInicial = (opciones: MergeOptions): EstadoComponente => ({
  porId: new Map(),
  orden: [],
  opciones,
  job: null,
  error: null,
  resultado: null,
  avisoPendiente: null,
});

export type Accion =
  | { tipo: 'ANADIR_PISTAS'; pistas: readonly AudioTrack[] }
  | { tipo: 'ACTUALIZAR_PISTA'; id: string; cambios: Partial<AudioTrack> }
  | { tipo: 'QUITAR_PISTA'; id: string }
  | { tipo: 'MOVER'; de: number; a: number }
  | { tipo: 'MOVER_ID'; id: string; delta: number }
  | { tipo: 'REORDENAR'; orden: readonly string[] }
  | { tipo: 'FIJAR_OPCIONES'; opciones: MergeOptions }
  | { tipo: 'AVISO_PENDIENTE'; razones: readonly { tipo: 'tamano' | 'duracion'; mensajeTecnico: string }[] }
  | { tipo: 'LIMPIAR_AVISO' }
  | { tipo: 'JOB_INICIADO'; job: MergeJob }
  | { tipo: 'JOB_PROGRESO'; job: MergeJob }
  | { tipo: 'JOB_COMPLETADO'; jobId: string; resultado: ResultadoUI }
  | { tipo: 'JOB_ERROR'; jobId: string; error: MergeError }
  | { tipo: 'JOB_CANCELADO' }
  | { tipo: 'ERROR'; error: MergeError }
  | { tipo: 'REINICIAR' }
  | { tipo: 'LIMPIAR_LISTA' };

export function reducer(estado: EstadoComponente, accion: Accion): EstadoComponente {
  switch (accion.tipo) {
    case 'ANADIR_PISTAS': {
      const porId = new Map(estado.porId);
      for (const p of accion.pistas) {
        if (porId.has(p.id)) {
          throw new MergeError({ code: 'INVALID_ORDER', message: `id duplicado al añadir: ${p.id}`, details: { id: p.id } });
        }
        porId.set(p.id, p);
      }
      // La estimación cambia al añadir: el aviso previo pendiente queda obsoleto.
      return { ...estado, porId, orden: [...estado.orden, ...accion.pistas.map((p) => p.id)], avisoPendiente: null };
    }

    case 'ACTUALIZAR_PISTA': {
      const actual = estado.porId.get(accion.id);
      if (!actual) {
        throw new MergeError({ code: 'INVALID_ORDER', message: `id desconocido al actualizar: ${accion.id}`, details: { id: accion.id } });
      }
      const porId = new Map(estado.porId);
      porId.set(accion.id, { ...actual, ...accion.cambios, id: actual.id, createdAt: actual.createdAt });
      return { ...estado, porId };
    }

    case 'QUITAR_PISTA': {
      if (!estado.porId.has(accion.id)) {
        throw new MergeError({ code: 'INVALID_ORDER', message: `id desconocido al quitar: ${accion.id}`, details: { id: accion.id } });
      }
      const porId = new Map(estado.porId);
      porId.delete(accion.id);
      return { ...estado, porId, orden: estado.orden.filter((id) => id !== accion.id) };
    }

    case 'MOVER': {
      return { ...estado, orden: reordenarLista(estado.orden, accion.de, accion.a) };
    }

    case 'MOVER_ID': {
      return { ...estado, orden: moverPorId(estado.orden, accion.id, accion.delta) };
    }

    case 'REORDENAR': {
      if (!esPermutacionValida(estado.orden, accion.orden, estado.porId)) {
        throw new MergeError({
          code: 'INVALID_ORDER',
          message: 'el orden propuesto no es una permutación del actual',
          details: { actual: estado.orden.length, propuesto: accion.orden.length },
        });
      }
      return { ...estado, orden: [...accion.orden] };
    }

    case 'FIJAR_OPCIONES': {
      // Cambiar opciones invalida la estimación previa (el aviso se recalcula).
      return { ...estado, opciones: accion.opciones, avisoPendiente: null };
    }

    case 'AVISO_PENDIENTE':
      return { ...estado, avisoPendiente: accion.razones };

    case 'LIMPIAR_AVISO':
      return { ...estado, avisoPendiente: null };

    case 'JOB_INICIADO': {
      // Guarda de ciclo de vida: un solo job activo (política de cola, plan.md §6).
      // El doble disparo es un error del integrador → fail-fast, sin reemplazo silencioso.
      if (estado.job?.status === 'running') {
        throw new MergeError({ code: 'JOB_IN_PROGRESS', message: 'JOB_INICIADO con un job en curso', details: { jobId: estado.job.id } });
      }
      return { ...estado, job: accion.job, error: null, resultado: null, avisoPendiente: null };
    }

    case 'JOB_PROGRESO': {
      // Guarda: el progreso tardío (tras completar/error/cancelar) o de OTRO job
      // (el anterior, con id distinto) se ignora idempotentemente.
      if (estado.job?.status !== 'running' || accion.job.id !== estado.job.id) return estado;
      return { ...estado, job: accion.job };
    }

    case 'JOB_COMPLETADO': {
      // Guarda: una finalización tardía o de OTRO job (id distinto) no tergiversa
      // el estado: se ignora idempotentemente.
      if (estado.job?.status !== 'running' || accion.jobId !== estado.job.id) return estado;
      const job = { ...estado.job, status: 'completed' as const, progress: 1, finishedAt: Date.now() };
      return { ...estado, job, resultado: accion.resultado, error: null, avisoPendiente: null };
    }

    case 'JOB_ERROR': {
      // Guarda: un error tardío o de OTRO job no tapa un resultado ya entregado.
      if (estado.job?.status !== 'running' || accion.jobId !== estado.job.id) return estado;
      return { ...estado, job: null, error: accion.error, resultado: null, avisoPendiente: null };
    }

    case 'JOB_CANCELADO':
      // El error USER_CANCELLED persiste: el estado 'cancelled' y el texto
      // «Unión cancelada» son visibles (renderizarError lo omite para no
      // mostrarlo como error). El resultado previo se descarta.
      return {
        ...estado,
        job: null,
        resultado: null,
        error: new MergeError({ code: 'USER_CANCELLED', message: 'unión cancelada por el usuario' }),
      };

    case 'ERROR':
      return { ...estado, error: accion.error };

    case 'REINICIAR':
      return { ...estado, job: null, error: null, resultado: null, avisoPendiente: null };

    case 'LIMPIAR_LISTA':
      return { ...estado, porId: new Map(), orden: [], job: null, resultado: null, error: null, avisoPendiente: null };

    default: {
      // Exhaustividad con never (aisla olvidos de unión a tipos).
      const sinTratar: never = accion;
      throw new MergeError({ code: 'UNKNOWN_ENGINE_ERROR', message: `acción no tratada: ${JSON.stringify(sinTratar)}` });
    }
  }
}

/** Selector: pistas válidas en orden (excluye invalid — tolerancia a fallos por pista). */
export function seleccionarPistasUnibles(estado: EstadoComponente): readonly AudioTrack[] {
  if (!ordenValido(estado.orden, estado.porId)) {
    throw new MergeError({ code: 'INVALID_ORDER', message: 'estado inconsistente: orden con ids desconocidos' });
  }
  return estado.orden
    .map((id) => estado.porId.get(id))
    .filter((p): p is AudioTrack => p !== undefined && p.status === 'ready');
}
