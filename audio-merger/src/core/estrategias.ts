/**
 * Estrategias de unión (FASE 4, PURAS — testeables sin WASM).
 *
 * La selección es una regla declarada (D-04): `-c copy` solo si TODAS las pistas
 * comparten códec/tasa/canales, el códec es nativo del formato de salida, la mezcla
 * de bitrates cabe en la tolerancia configurada y ningún post-proceso activo exige
 * re-codificación. AAC de entrada SIEMPRE re-codifica (priming/edit lists).
 *
 * El plan estructural intermedio (`PlanEstructural`) es lo que los post-procesos
 * registrados transforman (Regla del Carro); la compilación a argumentos ffmpeg
 * es una función pura más.
 */
import { MergeError } from './errors';
import type { MergeOptions, MergePlan, ProbeInfo } from './types';
import type { AudioMergerConfig } from '../config/defaults';
import type { EntradaUnion, PlanificadorUnion } from './merge';
import { extensionSegura } from './tracks';
import {
  formatoSalida,
  nombreInterno,
  postProcesosActivos,
  type DescriptorFormatoSalida,
  type PlanEstructural,
} from '../config/registry';

/** Rutas del protocolo interno del motor (constantes técnicas compartidas con engine/ffmpeg.ts). */
export const RUTA_ENTRADA = '/input';
export const RUTA_SALIDA = '/output';
const RUTA_LISTA = `${RUTA_SALIDA}/list.txt`;

/** ¿Es elegible la copia directa con los metadatos de la sonda? (regla D-04) */
export function esCopiaElegible(
  infos: readonly ProbeInfo[],
  formato: DescriptorFormatoSalida,
  opciones: Readonly<Record<string, unknown>>,
  config: Readonly<AudioMergerConfig>,
): boolean {
  if (infos.length === 0) return false;
  if (postProcesosActivos(opciones).some((p) => p.requiereRecodificacion)) return false;

  const codec0 = infos[0]!.codec;
  if (!formato.codecsNativosParaCopia.includes(codec0)) return false;

  const tasa0 = infos[0]!.sampleRateHz;
  const canales0 = infos[0]!.channels;
  // Parámetros DESCONOCIDOS (0) bloquean la copia: nunca copiar a ciegas.
  if (tasa0 <= 0 || canales0 <= 0) return false;
  for (const info of infos) {
    if (info.codec !== codec0 || info.sampleRateHz !== tasa0 || info.channels !== canales0) return false;
    if (info.sampleRateHz <= 0 || info.channels <= 0) return false;
  }

  // Mezcla VBR/CBR (o bitrates dispares): solo bajo tolerancia configurable.
  const bitrates = infos.map((i) => i.bitrateKbps).filter((b): b is number => b !== null);
  if (bitrates.length === infos.length && bitrates.length > 1) {
    const min = Math.min(...bitrates);
    const max = Math.max(...bitrates);
    const tolerancia = config.copyRule.bitrateTolerancePct / 100;
    if (max - min > max * tolerancia) return false;
  }
  return true;
}

/** Resuelve el bitrate efectivo y valida coherencia con el formato de salida. */
export function resolverBitrate(opciones: MergeOptions, formato: DescriptorFormatoSalida): number | null {
  const bitrate = opciones.bitrateKbps ?? formato.bitratePorDefecto;
  if (formato.bitratesKbps === null) {
    if (bitrate !== null) {
      throw new MergeError({
        code: 'INVALID_OPTIONS',
        message: `el formato «${formato.id}» no usa bitrate (recibido: ${bitrate})`,
        details: { formato: formato.id, bitrate },
      });
    }
    return null;
  }
  if (bitrate === null || !formato.bitratesKbps.includes(bitrate)) {
    throw new MergeError({
      code: 'INVALID_OPTIONS',
      message: `bitrate ${String(bitrate)} no disponible para «${formato.id}» (válidos: ${formato.bitratesKbps.join(', ')})`,
      details: { formato: formato.id, bitrate, validos: [...formato.bitratesKbps] },
    });
  }
  return bitrate;
}

const layout = (canales: number): string => (canales === 1 ? 'mono' : 'stereo');

/** Compila el plan estructural a argumentos ffmpeg (puro). */
export function compilarPlan(plan: PlanEstructural, formato: DescriptorFormatoSalida): readonly string[] {
  const argsComunes = ['-hide_banner', '-nostdin', '-y'];
  if (plan.strategy === 'copy') {
    // Demuxer concat + copia de streams. -map_metadata -1: sin metadata heredada.
    return [...argsComunes, '-f', 'concat', '-safe', '0', '-i', RUTA_LISTA, '-map', '0:a', '-map_metadata', '-1', '-c', 'copy', plan.rutaSalida];
  }
  const entradas = plan.rutasInternas.flatMap((ruta) => ['-i', ruta]);
  const etiquetas = plan.rutasInternas.map((_, i) => `[a${i}]`);
  const cadenas = plan.filtros.map((fs, i) => `[${i}:a]${fs.join(',')}[a${i}]`);
  const grafo = `${cadenas.join(';')};${etiquetas.join('')}concat=n=${plan.rutasInternas.length}:v=0:a=1[out]`;
  return [...argsComunes, ...entradas, '-filter_complex', grafo, '-map', '[out]', '-map_metadata', '-1', ...plan.argsSalida, plan.rutaSalida];
}

/**
 * Planificador inyectable en mergeTracks (FASE 3). Puro: sonda + opciones + config → plan.
 */
export const planificarUnion: PlanificadorUnion = (
  sonda,
  entradas,
  opciones,
  config,
) => {
  const formato = formatoSalida(opciones.format);
  if (!formato) {
    throw new MergeError({
      code: 'INVALID_OPTIONS',
      message: `formato de salida no registrado: ${opciones.format}`,
      details: { formato: opciones.format },
    });
  }
  const bitrate = resolverBitrate(opciones, formato);

  const n = entradas.length;
  const extensiones = entradas.map((e) => extensionSegura(e.name));
  const rutasInternas = entradas.map((e, i) => `${RUTA_ENTRADA}/${nombreInterno(i, extensiones[i]!, n)}`);
  const infos = sonda.map((s) => s.info);
  const opcionesPlano = opciones as unknown as Readonly<Record<string, unknown>>;

  const usarCopia = esCopiaElegible(infos, formato, opcionesPlano, config);
  const rutaSalida = `${RUTA_SALIDA}/salida.${formato.extension}`;

  let estructural: PlanEstructural;
  if (usarCopia) {
    // En copy no hay filtros: el campo existe para los post-procesos (que forzarán
    // re-codificación si aplican); se inicializa vacío.
    estructural = {
      strategy: 'copy',
      rutasInternas,
      filtros: rutasInternas.map(() => [] as readonly string[]),
      listaConcat: rutasInternas.map((ruta) => `file '${ruta}'`),
      argsSalida: ['-c', 'copy'],
      rutaSalida,
      salidaMimeType: formato.mimeType,
      salidaExtension: formato.extension,
    };
  } else {
    const aformat = `aformat=sample_rates=${formato.sampleRateHz}:channel_layouts=${layout(formato.canales)}`;
    estructural = {
      strategy: 'reencode',
      rutasInternas,
      filtros: rutasInternas.map(() => [aformat]),
      listaConcat: null,
      argsSalida: [...formato.argsCodificacion(bitrate)],
      rutaSalida,
      salidaMimeType: formato.mimeType,
      salidaExtension: formato.extension,
    };
  }

  // Post-procesos registrados y ACTIVOS transforman el plan (Regla del Carro).
  const activos = postProcesosActivos(opcionesPlano);
  for (const paso of activos) {
    estructural = paso.transformar(estructural, { sonda, opciones: opcionesPlano, config });
    if (paso.requiereRecodificacion && estructural.strategy !== 'reencode') {
      // Un paso declaró requerir re-codificación pero el plan sigue en copy:
      // incoherencia del registro → error de configuración, no silencio.
      throw new MergeError({
        code: 'CONFIG_INVALID',
        message: `el post-proceso «${paso.id}» exige re-codificación pero el plan quedó en copia`,
        details: { postProceso: paso.id },
      });
    }
  }

  const duraciones = infos.map((i) => i.durationMs);
  const expectedDurationMs = duraciones.every((d) => d !== null) ? duraciones.reduce((s, d) => s + (d ?? 0), 0) : null;

  return {
    strategy: estructural.strategy,
    args: compilarPlan(estructural, formato),
    outputInternalName: estructural.rutaSalida,
    listaConcat: estructural.listaConcat ?? undefined,
    outputMimeType: estructural.salidaMimeType,
    outputExtension: estructural.salidaExtension,
    expectedDurationMs,
  } satisfies MergePlan;
};
