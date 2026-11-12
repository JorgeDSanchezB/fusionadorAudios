/**
 * Registro de formatos, salidas, opciones y post-procesos (FASE 4 — Regla del Carro).
 *
 * Añadir un formato de entrada / una opción de salida / un paso de post-proceso
 * es REGISTRAR un descriptor aquí: ni el core ni el motor cambian. El registro
 * valida cada descriptor (CONFIG_INVALID si el registro es defectuoso) y congela
 * los descriptores.
 *
 * Anti-sobreingeniería: el registry existe porque la extensibilidad es REQUISITO
 * (Regla del Carro); la alternativa (switches en el motor) multiplicaría los casos
 * de prueba por cada formato nuevo. El coste es una capa de indirección con
 * descriptores pequeños y revisables.
 */
import { MergeError } from '../core/errors';
import type { OptionSchema } from '../core/validation';
import type { Sniffer } from '../core/validar-salida';
import type { MergePlan } from '../core/types';
import type { AudioMergerConfig } from './defaults';
import type { ProbeInfo } from '../core/types';

// ——— Formatos de ENTRADA ———

export interface DescriptorFormatoEntrada {
  /** Id estable (minúsculas), p. ej. 'mp3'. */
  readonly id: string;
  /** Extensiones aceptadas (sin punto, minúsculas). */
  readonly extensions: readonly string[];
  /** MIME types aceptados (minúsculas). */
  readonly mimeTypes: readonly string[];
  /** Clave i18n con la etiqueta visible. */
  readonly etiquetaKey: string;
}

const formatosEntrada = new Map<string, DescriptorFormatoEntrada>();

export function registrarFormatoEntrada(d: DescriptorFormatoEntrada): void {
  validarId(d.id, 'formato de entrada');
  if (formatosEntrada.has(d.id)) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `formato de entrada ya registrado: ${d.id}`, details: { id: d.id } });
  }
  if (!d.extensions?.length && !d.mimeTypes?.length) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `formato «${d.id}» sin extensiones ni MIME types`, details: { id: d.id } });
  }
  if (!/^[a-z0-9]{1,12}$/.test(d.id) || d.extensions.some((e) => !/^[a-z0-9]{1,8}$/.test(e))) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `ids/extensiones deben ser [a-z0-9] (recibido: ${d.id} / ${d.extensions.join(',')})`, details: { id: d.id } });
  }
  formatosEntrada.set(d.id, Object.freeze({ ...d, extensions: [...d.extensions], mimeTypes: [...d.mimeTypes] }));
}

export function formatosEntradaRegistrados(): readonly DescriptorFormatoEntrada[] {
  return [...formatosEntrada.values()];
}

export function buscarFormatoEntrada(nombreArchivo: string, mimeType: string): DescriptorFormatoEntrada | null {
  const i = nombreArchivo.lastIndexOf('.');
  const ext = i > 0 ? nombreArchivo.slice(i + 1).toLowerCase() : '';
  const mime = (mimeType || '').toLowerCase();
  for (const f of formatosEntrada.values()) {
    if ((ext !== '' && f.extensions.includes(ext)) || (mime !== '' && f.mimeTypes.includes(mime))) return f;
  }
  return null;
}

// ——— Formatos de SALIDA ———

export interface DescriptorFormatoSalida {
  readonly id: string;
  readonly etiquetaKey: string;
  readonly mimeType: string;
  readonly extension: string;
  /** Códec ffmpeg de re-codificación (p. ej. 'libmp3lame', 'pcm_s16le'). */
  readonly codec: string;
  /**
   * Argumentos de codificación a partir del bitrate (null cuando el formato no
   * usa bitrate, p. ej. WAV). Incluye normalización de tasa/canales.
   */
  readonly argsCodificacion: (bitrateKbps: number | null) => readonly string[];
  /** Bitrates ofrecidos (kbps) o null si el formato no los usa. */
  readonly bitratesKbps: readonly number[] | null;
  readonly bitratePorDefecto: number | null;
  /** Perfil de salida para `aformat` del filtro concat. */
  readonly sampleRateHz: number;
  readonly canales: 1 | 2;
  /** Bytes/segundo estimados de salida (para la estimación previa). */
  readonly bytesPorSegundo: (bitrateKbps: number | null) => number | null;
  /** Sniffer del contenedor de salida (validación post-unión). */
  readonly sniff: Sniffer;
  /** Códecs de entrada NATIVOS de este formato: con ellos se permite `-c copy`. */
  readonly codecsNativosParaCopia: readonly string[];
}

const formatosSalida = new Map<string, DescriptorFormatoSalida>();

export function registrarFormatoSalida(d: DescriptorFormatoSalida): void {
  validarId(d.id, 'formato de salida');
  if (formatosSalida.has(d.id)) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `formato de salida ya registrado: ${d.id}`, details: { id: d.id } });
  }
  if (!d.argsCodificacion || typeof d.argsCodificacion !== 'function') {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `formato de salida «${d.id}» sin argsCodificacion`, details: { id: d.id } });
  }
  if (d.bitratesKbps !== null && d.bitratePorDefecto === null) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `formato «${d.id}» con bitrates pero sin bitratePorDefecto`, details: { id: d.id } });
  }
  formatosSalida.set(d.id, Object.freeze({ ...d }));
}

export function formatosSalidaRegistrados(): readonly DescriptorFormatoSalida[] {
  return [...formatosSalida.values()];
}

export function formatoSalida(id: string): DescriptorFormatoSalida | null {
  return formatosSalida.get(id) ?? null;
}

// ——— Opciones de unión registradas (esquemas dinámicos) ———

const opcionesRegistradas = new Map<string, DescriptorOpcion>();

export interface DescriptorOpcion {
  readonly esquema: OptionSchema;
  /** Clave i18n con la etiqueta visible (UI/selectores). */
  readonly etiquetaKey: string;
}

export function registrarOpcion(descriptor: DescriptorOpcion): void {
  const clave = descriptor.esquema.key;
  validarIdCamel(clave, 'opción');
  if (opcionesRegistradas.has(clave)) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `opción ya registrada: ${clave}`, details: { clave } });
  }
  opcionesRegistradas.set(clave, Object.freeze({ ...descriptor, esquema: Object.freeze({ ...descriptor.esquema }) }));
}

/** Esquemas de TODAS las opciones registradas (format y bitrate son estructurales). */
export function esquemasOpcionesRegistradas(): readonly OptionSchema[] {
  return [...opcionesRegistradas.values()].map((o) => o.esquema);
}

export function esquemaDeOpcion(clave: string): OptionSchema | null {
  return opcionesRegistradas.get(clave)?.esquema ?? null;
}

// ——— Post-procesos (pasos que transforman el plan) ———

/** Plan estructural intermedio que los post-procesos transforman antes de compilar. */
export interface PlanEstructural {
  strategy: 'copy' | 'reencode';
  /** Rutas internas de entrada en orden (p1.ext…). */
  readonly rutasInternas: readonly string[];
  /** Cadena de filtros por entrada (solo reencode), p. ej. ['afade=t=in:…']. */
  readonly filtros: readonly (readonly string[])[];
  /** Contenido del archivo de lista del demuxer concat (solo copy). */
  listaConcat: readonly string[] | null;
  /** Argumentos del codec de salida (se compilan al final). */
  argsSalida: readonly string[];
  readonly rutaSalida: string;
  readonly salidaMimeType: string;
  readonly salidaExtension: string;
}

export interface ContextoPostProceso {
  readonly sonda: readonly { id: string; info: ProbeInfo }[];
  readonly opciones: Readonly<Record<string, unknown>>;
  readonly config: Readonly<AudioMergerConfig>;
}

export interface DescriptorPostProceso {
  /** Id estable del paso. */
  readonly id: string;
  /** Opción que lo activa (clave del registro de opciones). */
  readonly optionKey: string;
  /** true → su presencia fuerza re-codificación (no puede aplicar sobre copy). */
  readonly requiereRecodificacion: boolean;
  /** Decide si el paso aplica con las opciones vigentes. */
  readonly aplica: (opciones: Readonly<Record<string, unknown>>) => boolean;
  /** Transforma el plan estructural (puro: añade filtros/cambia strategy). */
  readonly transformar: (plan: PlanEstructural, ctx: ContextoPostProceso) => PlanEstructural;
}

const postProcesos = new Map<string, DescriptorPostProceso>();

export function registrarPostProceso(d: DescriptorPostProceso): void {
  validarIdCamel(d.id, 'post-proceso');
  if (postProcesos.has(d.id)) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `post-proceso ya registrado: ${d.id}`, details: { id: d.id } });
  }
  if (!opcionesRegistradas.has(d.optionKey)) {
    throw new MergeError({
      code: 'CONFIG_INVALID',
      message: `post-proceso «${d.id}» referencia una opción no registrada: ${d.optionKey}`,
      details: { id: d.id, optionKey: d.optionKey },
    });
  }
  postProcesos.set(d.id, Object.freeze({ ...d }));
}

/** Post-procesos ACTIVOS con las opciones dadas (en orden de registro). */
export function postProcesosActivos(opciones: Readonly<Record<string, unknown>>): readonly DescriptorPostProceso[] {
  return [...postProcesos.values()].filter((p) => p.aplica(opciones));
}

export function postProcesosRegistrados(): readonly DescriptorPostProceso[] {
  return [...postProcesos.values()];
}

// ——— Utilidades de validación ———

function validarId(id: string, tipo: string): void {
  if (typeof id !== 'string' || !/^[a-z0-9]{1,12}$/.test(id)) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `id de ${tipo} inválido: «${String(id)}» (se espera [a-z0-9]{1,12})`, details: { id } });
  }
}

function validarIdCamel(id: string, tipo: string): void {
  if (typeof id !== 'string' || !/^[a-z][a-zA-Z0-9]{1,31}$/.test(id)) {
    throw new MergeError({ code: 'CONFIG_INVALID', message: `id de ${tipo} inválido: «${String(id)}» (se espera camelCase)`, details: { id } });
  }
}

/** Nombre interno sanitizado (D-11): p<N>.<ext> — jamás el nombre del usuario. */
export function nombreInterno(posicion: number, extension: string, nPistas: number): string {
  const ancho = String(Math.max(1, nPistas)).length;
  return `p${String(posicion + 1).padStart(ancho, '0')}.${extension}`;
}

/** Resete completo (solo para tests y reinicialización explícita). */
export function reiniciarRegistros(): void {
  formatosEntrada.clear();
  formatosSalida.clear();
  opcionesRegistradas.clear();
  postProcesos.clear();
}

/** Reexport de conveniencia para el plan compilado (contrato único). */
export type { MergePlan };
