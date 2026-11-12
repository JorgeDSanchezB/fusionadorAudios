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
import { MergeError, toMergeError } from './errors';
import type { MergeOptions, MergeOutput, MergePlan, MergeProgress, MergeStage, MergeWarning, ProbeInfo } from './types';
import type { AudioMergerConfig } from '../config/defaults';
import { comprobarMinimoPistas } from './tracks';
import { erroresDeLimites } from './estimacion';
import { aplicarDefaults, validateOptionValues, type OptionSchema } from './validation';
import { formatearBytes, formatearDuracion, marcaDeTiempo } from '../utils/format';

/** Entrada de unión: el blob del archivo del usuario con su id estable. */
export interface EntradaUnion {
  readonly id: string;
  readonly name: string;
  readonly blob: Blob;
}

/** Resultado de sonda por entrada: metadatos o error clasificado de ESA pista. */
export type ResultadoSonda = { readonly id: string; readonly info: ProbeInfo } | { readonly id: string; readonly error: MergeError };

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
export type PlanificadorUnion = (
  sonda: readonly { id: string; info: ProbeInfo }[],
  entradas: readonly EntradaUnion[],
  opciones: MergeOptions,
  config: Readonly<AudioMergerConfig>,
) => MergePlan;

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

function nombreDeSalida(config: Readonly<AudioMergerConfig>, plan: MergePlan, nPistas: number): string {
  return config.outputNamePattern
    .replaceAll('{ext}', plan.outputExtension)
    .replaceAll('{n}', String(nPistas))
    .replaceAll('{fecha}', marcaDeTiempo());
}

export async function mergeTracks(
  entradas: readonly EntradaUnion[],
  opcionesBrutas: MergeOptions,
  ctx: ContextoUnion,
): Promise<MergeOutput> {
  const { config, motor, planificador, validadorContenedor, esquemasOpciones, signal, onProgress } = ctx;
  const pesos = config.engine.progressWeights;

  const emitir = (stage: MergeStage, progress: number, detail?: string): void => {
    // Monotonicidad GARANTIZADA: los eventos de progreso del motor pueden regresar
    // (ffmpeg emite saltos); el contrato público promete 0..1 creciente.
    const valor = Math.min(1, Math.max(0, progress));
    if (valor < progresoMaximo) return;
    progresoMaximo = valor;
    try {
      onProgress?.({ stage, progress: valor, detail });
    } catch {
      // Un suscriptor que lanza no puede romper la unión: se aísla.
    }
  };
  let progresoMaximo = 0;
  const lanzarSiCancelado = (): void => {
    if (signal?.aborted) throw new MergeError({ code: 'USER_CANCELLED', message: 'unión cancelada antes de continuar' });
  };

  // 0) Precondiciones puras: esquema de opciones + mínimos + límites duros.
  const issues = validateOptionValues(opcionesBrutas as Record<string, unknown>, esquemasOpciones);
  if (issues.length > 0) {
    throw new MergeError({
      code: 'INVALID_OPTIONS',
      message: issues.map((i) => `${i.key}: se esperaba ${i.esperado}, se recibió ${JSON.stringify(i.recibido)}`).join('; '),
      details: { issues },
    });
  }
  const opciones = aplicarDefaults(opcionesBrutas as Record<string, unknown>, esquemasOpciones) as unknown as MergeOptions;

  lanzarSiCancelado();
  const errMinimo = comprobarMinimoPistas(entradas.length, config.limits);
  if (errMinimo) throw errMinimo;

  // Límite POR ARCHIVO aplicado también en la vía de librería (crearUnion),
  // no solo al añadir en la UI (validarArchivoEntrada).
  const excesiva = entradas.find((e) => e.blob.size > config.limits.maxFileBytes);
  if (excesiva) {
    throw new MergeError({
      code: 'FILE_TOO_LARGE',
      message: `${excesiva.name}: ${excesiva.blob.size} B supera el máximo ${config.limits.maxFileBytes} B`,
      details: { nombre: excesiva.name, tamano: excesiva.blob.size, maximo: config.limits.maxFileBytes },
    });
  }

  const erroresLimites = erroresDeLimites(entradas.map((e) => ({ name: e.name, size: e.blob.size, durationMs: null })), config.limits);
  if (erroresLimites.length > 0) throw erroresLimites[0]!;

  // 1) Carga del motor (bajo demanda, NUNCA antes): peso engineLoad.
  emitir('loading-engine', 0);
  const alAbortarCarga = (): void => {
    motor.cancelar();
  };
  signal?.addEventListener('abort', alAbortarCarga, { once: true });
  try {
    await motor.ensureLoaded((frac) => emitir('loading-engine', frac * pesos.engineLoad));
  } catch (e) {
    if (signal?.aborted) throw new MergeError({ code: 'USER_CANCELLED', message: 'unión cancelada durante la carga del motor' });
    throw toMergeError(e, 'WASM_LOAD_FAILED');
  } finally {
    signal?.removeEventListener('abort', alAbortarCarga);
  }
  emitir('loading-engine', pesos.engineLoad);

  // 2) Sonda: una pasada por todas las entradas (D-09); peso probe.
  lanzarSiCancelado();
  emitir('probing', pesos.engineLoad);
  let sonda: readonly ResultadoSonda[];
  signal?.addEventListener('abort', alAbortarCarga, { once: true });
  try {
    sonda = await motor.sondear(entradas);
  } catch (e) {
    if (signal?.aborted) throw new MergeError({ code: 'USER_CANCELLED', message: 'unión cancelada durante la sonda' });
    throw toMergeError(e, 'PROBE_FAILED');
  } finally {
    signal?.removeEventListener('abort', alAbortarCarga);
  }
  emitir('probing', pesos.engineLoad + pesos.probe);

  // Invariante sonda↔entradas: mismos ids, sin duplicados ni extraños.
  const idsEntrada = new Set(entradas.map((e) => e.id));
  const idsSonda = sonda.map((r) => r.id);
  if (idsSonda.length !== entradas.length || new Set(idsSonda).size !== idsSonda.length || idsSonda.some((id) => !idsEntrada.has(id))) {
    throw new MergeError({
      code: 'PROBE_FAILED',
      message: `la sonda devolvió ${idsSonda.length} resultados para ${entradas.length} entradas`,
      details: { esperados: entradas.length, recibidos: idsSonda.length },
    });
  }

  // Fallos de sonda clasificados POR PISTA: corrupto vs no clasificable.
  const fallidas = sonda.filter((r): r is { id: string; error: MergeError } => 'error' in r);
  if (fallidas.length > 0) {
    const corruptas = fallidas.filter((f) => f.error.code === 'CORRUPT_FILE');
    const base = corruptas.length > 0 ? corruptas[0]!.error : fallidas[0]!.error;
    const porId = new Map(entradas.map((e) => [e.id, e.name]));
    throw new MergeError({
      code: base.code,
      message: `${base.message} [pistas: ${fallidas.map((f) => porId.get(f.id) ?? f.id).join(', ')}]`,
      details: {
        ids: fallidas.map((f) => f.id),
        nombres: fallidas.map((f) => porId.get(f.id) ?? f.id),
        causas: fallidas.map((f) => f.error.code),
      },
    });
  }
  const infoSonda = sonda.map((r) => ({ id: (r as { id: string }).id, info: (r as { info: ProbeInfo }).info }));

  // Límite duro de duración: con la sonda ya conocemos las duraciones reales.
  // Si alguna es desconocida, el límite no se aplica (no se bloquea por falta de dato;
  // el aviso previo de la UI sigue cubriendo el caso con la cota de tamaños).
  if (config.limits.maxDurationMs !== null) {
    const duraciones = infoSonda.map((s) => s.info.durationMs);
    if (duraciones.every((d) => d !== null)) {
      const total = duraciones.reduce((s, d) => s + (d ?? 0), 0);
      if (total > config.limits.maxDurationMs) {
        throw new MergeError({
          code: 'DURATION_TOO_LONG',
          message: `Σ duraciones ${total} ms > máximo ${config.limits.maxDurationMs} ms`,
          details: { total, maximo: config.limits.maxDurationMs },
        });
      }
    }
  }

  // 3) Planificación (estrategia + post-procesos registrados).
  lanzarSiCancelado();
  const plan = planificador(infoSonda, entradas, opciones, config);

  // 4) Ejecución: peso merge.
  emitir('merging', pesos.engineLoad + pesos.probe);
  let bytes: Uint8Array;
  signal?.addEventListener('abort', alAbortarCarga, { once: true });
  try {
    bytes = await motor.ejecutar(plan, entradas, (frac) => emitir('merging', pesos.engineLoad + pesos.probe + frac * pesos.merge));
  } catch (e) {
    if (signal?.aborted) throw new MergeError({ code: 'USER_CANCELLED', message: 'unión cancelada durante la ejecución' });
    throw toMergeError(e);
  } finally {
    signal?.removeEventListener('abort', alAbortarCarga);
  }
  emitir('merging', pesos.engineLoad + pesos.probe + pesos.merge);
  // La cancelación tiene prioridad hasta que la promesa se resuelve: si llegó
  // un abort justo tras terminar la ejecución, gana la cancelación (contrato).
  lanzarSiCancelado();

  // 5) Validación de salida: contenedor + duración (advertencias visibles).
  emitir('validating', pesos.engineLoad + pesos.probe + pesos.merge);
  if (bytes.length === 0 || !validadorContenedor(bytes, opciones.format)) {
    throw new MergeError({
      code: 'UNKNOWN_ENGINE_ERROR',
      message: `la salida no es un contenedor ${plan.outputExtension} válido (${bytes.length} B)`,
      details: { formato: opciones.format, bytes: bytes.length },
    });
  }

  let duracionSalida: number | null = null;
  signal?.addEventListener('abort', alAbortarCarga, { once: true });
  try {
    duracionSalida = await motor.medirDuracion(new Blob([bytes as unknown as BlobPart], { type: plan.outputMimeType }));
  } catch {
    // La medición es best-effort: un fallo aquí no invalida la unión, se declara.
    duracionSalida = null;
  } finally {
    signal?.removeEventListener('abort', alAbortarCarga);
  }
  // La medición puede tardar: la cancelación sigue teniendo prioridad.
  lanzarSiCancelado();
  const warnings: MergeWarning[] = [];
  if (plan.expectedDurationMs !== null && duracionSalida !== null) {
    const tolerancia = Math.max(
      config.durationCheck.toleranceMs,
      plan.expectedDurationMs * (config.durationCheck.tolerancePct / 100),
    );
    if (Math.abs(duracionSalida - plan.expectedDurationMs) > tolerancia) {
      warnings.push({
        code: 'DURATION_MISMATCH',
        message: `duración obtenida ${Math.round(duracionSalida)} ms ≠ esperada ${plan.expectedDurationMs} ms (tolerancia ${Math.round(tolerancia)} ms)`,
        params: {
          obtenida: formatearDuracion(duracionSalida),
          esperada: formatearDuracion(plan.expectedDurationMs),
        },
      });
    }
  }

  emitir('validating', 1);

  // 6) Salida + liberación de memoria si procede (D-05).
  if (bytes.byteLength > config.engine.restartAfterBytes) {
    motor.dispose();
    warnings.push({
      code: 'ENGINE_RESTARTED',
      message: `salida de ${formatearBytes(bytes.byteLength)}: motor reiniciado para liberar memoria`,
    });
  }

  return {
    blob: new Blob([bytes as unknown as BlobPart], { type: plan.outputMimeType }),
    name: nombreDeSalida(config, plan, entradas.length),
    mimeType: plan.outputMimeType,
    size: bytes.byteLength,
    durationMs: duracionSalida,
    strategy: plan.strategy,
    warnings,
  };
}
