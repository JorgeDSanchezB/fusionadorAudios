/**
 * Helpers puros sobre pistas (FASE 2/5): validación de entradas, admisión bajo
 * límites, totales y reorden. Sin DOM ni motor → testeable en Node.
 */
import { MergeError } from './errors';
import type { AudioTrack } from './types';
import type { LimitsConfig } from '../config/defaults';
import { indicesReordenValidos, ordenValido } from './validation';

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

export function extensionDe(nombre: string): string {
  const i = nombre.lastIndexOf('.');
  return i > 0 ? nombre.slice(i + 1).toLowerCase() : '';
}

/**
 * Extensión CANÓNICA de una entrada (planificador y motor usan ESTA función:
 * evita divergencias de nombres internos). Sin extensión útil → 'bin'.
 */
export function extensionSegura(nombre: string): string {
  const e = extensionDe(nombre);
  return e !== '' && /^[a-z0-9]{1,8}$/.test(e) ? e : 'bin';
}

/**
 * Valida UN archivo contra formatos y límites. Devuelve el error clasificado o null.
 * Distingue: formato no registrado / demasiado grande / sin nombre utilizable.
 */
export function validarArchivoEntrada(
  archivo: ArchivoDeEntrada,
  formatos: readonly DescriptorFormatoEntrada[],
  limits: LimitsConfig,
): MergeError | null {
  const ext = extensionDe(archivo.name);
  const mime = (archivo.type || '').toLowerCase();
  const registrado = formatos.some(
    (f) => (ext !== '' && f.extensions.includes(ext)) || (mime !== '' && f.mimeTypes.includes(mime)),
  );
  if (!registrado) {
    return new MergeError({
      code: 'UNSUPPORTED_FORMAT',
      message: `formato no registrado: ${archivo.name || '(sin nombre)'} [${ext || 'sin extensión'}${mime ? `; ${mime}` : ''}]`,
      details: { nombre: archivo.name, extension: ext, mimeType: mime },
    });
  }
  if (archivo.size > limits.maxFileBytes) {
    return new MergeError({
      code: 'FILE_TOO_LARGE',
      message: `${archivo.name}: ${archivo.size} B supera el máximo ${limits.maxFileBytes} B`,
      details: { nombre: archivo.name, tamano: archivo.size, maximo: limits.maxFileBytes },
    });
  }
  return null;
}

export interface AdmisionPistas {
  readonly admitidas: readonly AudioTrack[];
  readonly rechazadas: readonly { readonly pista: AudioTrack; readonly error: MergeError }[];
}

/**
 * Separa pistas nuevas en admitidas/rechazadas según maxTracks y maxTotalBytes
 * (la suma incluye las YA en lista). Orden de llegada preservado.
 */
export function seleccionarAdmisibles(
  nuevas: readonly AudioTrack[],
  pistasActuales: readonly AudioTrack[],
  limits: LimitsConfig,
): AdmisionPistas {
  const admitidas: AudioTrack[] = [];
  const rechazadas: { pista: AudioTrack; error: MergeError }[] = [];
  const ocupacion = pistasActuales.length;
  const bytesActuales = pistasActuales.reduce((s, p) => s + p.size, 0);

  let ocupadas = ocupacion;
  let bytes = bytesActuales;
  for (const pista of nuevas) {
    if (ocupadas >= limits.maxTracks) {
      rechazadas.push({
        pista,
        error: new MergeError({
          code: 'TOO_MANY_TRACKS',
          message: `límite de pistas alcanzado (${limits.maxTracks})`,
          details: { maximo: limits.maxTracks },
        }),
      });
      continue;
    }
    if (bytes + pista.size > limits.maxTotalBytes) {
      rechazadas.push({
        pista,
        error: new MergeError({
          code: 'TOTAL_TOO_LARGE',
          message: `«${pista.name}» desborda el tamaño total (${bytes + pista.size} B > ${limits.maxTotalBytes} B)`,
          details: { nombre: pista.name, total: bytes + pista.size, maximo: limits.maxTotalBytes },
        }),
      });
      continue;
    }
    admitidas.push(pista);
    ocupadas += 1;
    bytes += pista.size;
  }
  return { admitidas, rechazadas };
}

/** Totales de la lista: duración null si ALGUNA es desconocida (no se inventa). */
export function totalesDeLista(pistas: readonly AudioTrack[]): { duracionMs: number | null; bytes: number } {
  let bytes = 0;
  let duracion: number | null = 0;
  for (const p of pistas) {
    bytes += p.size;
    if (p.durationMs === null) duracion = null;
    else if (duracion !== null) duracion += p.durationMs;
  }
  return { duracionMs: duracion, bytes };
}

/** Reorden puro por índices (0-based). Lanza INVALID_ORDER si los índices no cuadran. */
export function reordenarLista<T>(lista: readonly T[], de: number, a: number): readonly T[] {
  const n = lista.length;
  if (!indicesReordenValidos(n, de, a)) {
    throw new MergeError({
      code: 'INVALID_ORDER',
      message: `reorden inválido ${de}→${a} en lista de ${n}`,
      details: { de, a, n },
    });
  }
  const copia = [...lista];
  const [movida] = copia.splice(de, 1);
  if (movida === undefined) {
    throw new MergeError({ code: 'INVALID_ORDER', message: `elemento inexistente en ${de}`, details: { de, a } });
  }
  copia.splice(a, 0, movida);
  return copia;
}

/** Mueve una pista por id un delta de posiciones (botones ↑/↓ y API moveTrack). */
export function moverPorId(orden: readonly string[], id: string, delta: number): readonly string[] {
  const de = orden.indexOf(id);
  if (de < 0) {
    throw new MergeError({ code: 'INVALID_ORDER', message: `id desconocido: ${id}`, details: { id } });
  }
  const a = de + delta;
  return reordenarLista(orden, de, a);
}

/** Comprueba que un orden nuevo es una permutación válida del actual. */
export function esPermutacionValida(actual: readonly string[], propuesta: readonly string[], porId: ReadonlyMap<string, unknown>): boolean {
  return (
    propuesta.length === actual.length &&
    ordenValido(propuesta, porId) &&
    actual.every((id) => propuesta.includes(id))
  );
}

/** Pistas VÁLIDAS en orden (las invalid se excluyen de la unión). */
export function pistasUnibles(porId: ReadonlyMap<string, AudioTrack>, orden: readonly string[]): readonly AudioTrack[] {
  return orden.map((id) => porId.get(id)).filter((p): p is AudioTrack => p !== undefined && p.status === 'ready');
}

/**
 * Invariante del mínimo de pistas (FASE 2, aplicado antes de unir por la orquestación
 * y por `merge()` público): NOT_ENOUGH_TRACKS o null si se cumple.
 */
export function comprobarMinimoPistas(nUnibles: number, limits: LimitsConfig): MergeError | null {
  if (!Number.isFinite(nUnibles)) {
    return new MergeError({ code: 'NOT_ENOUGH_TRACKS', message: `número de pistas no finito: ${nUnibles}`, details: { obtenidas: nUnibles, minimo: limits.minTracks } });
  }
  if (nUnibles < limits.minTracks) {
    return new MergeError({
      code: 'NOT_ENOUGH_TRACKS',
      message: `${nUnibles} pista(s) válida(s) < mínimo ${limits.minTracks}`,
      details: { obtenidas: nUnibles, minimo: limits.minTracks },
    });
  }
  return null;
}
