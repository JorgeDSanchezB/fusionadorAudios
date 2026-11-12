/**
 * API pública de @zai/audio-merger.
 *
 * La importación registra los formatos, salidas y opciones DE SERIE (Regla del
 * Carro: todo pasa por el registro). Extender = registrar descriptores nuevos,
 * jamás editar el núcleo.
 */
export * from './core/errors';
export type * from './core/types';
export { DEFAULT_CONFIG } from './config/defaults';
export type { AudioMergerConfig, EngineMode } from './config/defaults';
export { resolverConfig, validarConfig, problemasDeConfig } from './config/validate';
export { ATRIBUTOS, parseAtributo, parseAtributos } from './config/atributos';
export {
  EVENTOS,
} from './core/eventos';
export type * from './core/eventos';
export { mergeTracks } from './core/merge';
export type { EntradaUnion, MotorUnion, PlanificadorUnion, ContextoUnion, ResultadoSonda, ValidadorContenedor } from './core/merge';
export { esMp3, esWav, esOgg, esFlac, esM4a, SNIFFERS } from './core/validar-salida';
export { planificarUnion, esCopiaElegible, resolverBitrate } from './core/estrategias';

export {
  registrarFormatoEntrada,
  registrarFormatoSalida,
  registrarOpcion,
  registrarPostProceso,
  formatosEntradaRegistrados,
  formatosSalidaRegistrados,
  formatoSalida,
  buscarFormatoEntrada,
  esquemasOpcionesRegistradas,
  postProcesosActivos,
  postProcesosRegistrados,
  nombreInterno,
  reiniciarRegistros,
} from './config/registry';
export type {
  DescriptorFormatoEntrada,
  DescriptorFormatoSalida,
  DescriptorOpcion,
  DescriptorPostProceso,
  PlanEstructural,
  ContextoPostProceso,
} from './config/registry';

export { MotorFfmpeg } from './engine/ffmpeg';
export { registrarFundido } from './extensiones/fundido';
export { parsearLogSonda, parsearDuracion, pareceOOM } from './engine/probe';
export { comprobarSoporteNavegador, resolverUrlsCore } from './engine/loader';
export { AudioMergerElement, registrarElemento, NOMBRE_ELEMENTO as NOMBRE_WEB_COMPONENT, VERSION } from './ui/audio-merger-element';
import { registrarElemento } from './ui/audio-merger-element';
export { leerDuracion } from './ui/metadatos';
export { calcularVentana } from './ui/lista-virtual';

import { esMp3, esWav } from './core/validar-salida';
import { registrarFormatoEntrada, registrarFormatoSalida, registrarOpcion, esquemasOpcionesRegistradas, formatosSalidaRegistrados, buscarFormatoEntrada } from './config/registry';
import { registrarFundido } from './extensiones/fundido';
import { planificarUnion } from './core/estrategias';
import { mergeTracks, type EntradaUnion, type ContextoUnion } from './core/merge';
import { MotorFfmpeg } from './engine/ffmpeg';
import { resolverConfig } from './config/validate';

let builtinsRegistrados = false;

// Builtins ANTES de definir el elemento: si el HTML anfitrión ya contiene un
// <audio-merger> (SSR/estático), customElements.define lo upgradea en el mismo
// tick y su primer render lee el registro; con los builtins pendientes la línea
// de formatos salía vacía («Formatos admitidos: ·» en el host Next). Registrar
// primero cierra esa ventana de carrera.

/** Registra los formatos/salidas/opciones de serie. Idempotente (y re-registra tras reiniciarRegistros). */
export function registrarBuiltins(): void {
  if (builtinsRegistrados && buscarFormatoEntrada('x.mp3', '') !== null) return;

  registrarFormatoEntrada({ id: 'mp3', extensions: ['mp3'], mimeTypes: ['audio/mpeg'], etiquetaKey: 'formato.mp3' });
  registrarFormatoEntrada({ id: 'wav', extensions: ['wav'], mimeTypes: ['audio/wav', 'audio/x-wav', 'audio/wave'], etiquetaKey: 'formato.wav' });
  registrarFormatoEntrada({ id: 'ogg', extensions: ['ogg', 'oga'], mimeTypes: ['audio/ogg', 'application/ogg', 'audio/vorbis'], etiquetaKey: 'formato.ogg' });
  registrarFormatoEntrada({ id: 'm4a', extensions: ['m4a', 'mp4'], mimeTypes: ['audio/mp4', 'audio/m4a', 'audio/x-m4a'], etiquetaKey: 'formato.m4a' });
  registrarFormatoEntrada({ id: 'flac', extensions: ['flac'], mimeTypes: ['audio/flac', 'audio/x-flac'], etiquetaKey: 'formato.flac' });

  registrarFormatoSalida({
    id: 'mp3',
    etiquetaKey: 'salida.mp3',
    mimeType: 'audio/mpeg',
    extension: 'mp3',
    codec: 'libmp3lame',
    argsCodificacion: (bitrateKbps) => ['-c:a', 'libmp3lame', '-b:a', `${bitrateKbps}k`, '-ar', '44100', '-ac', '2'],
    bitratesKbps: [128, 192, 320],
    bitratePorDefecto: 192,
    sampleRateHz: 44100,
    canales: 2,
    bytesPorSegundo: (bitrateKbps) => (bitrateKbps !== null ? (bitrateKbps * 1000) / 8 : null),
    sniff: esMp3,
    codecsNativosParaCopia: ['mp3'],
  });
  registrarFormatoSalida({
    id: 'wav',
    etiquetaKey: 'salida.wav',
    mimeType: 'audio/wav',
    extension: 'wav',
    codec: 'pcm_s16le',
    argsCodificacion: () => ['-c:a', 'pcm_s16le', '-ar', '44100', '-ac', '2'],
    bitratesKbps: null,
    bitratePorDefecto: null,
    sampleRateHz: 44100,
    canales: 2,
    bytesPorSegundo: () => 44100 * 2 * 2,
    sniff: esWav,
    codecsNativosParaCopia: ['pcm_s16le'],
  });

  // Opciones estructurales (formato/bitrate) + extensión de serie (fundido).
  registrarOpcion({ esquema: { key: 'format', type: 'enum', values: () => formatosSalidaRegistrados().map((f) => f.id) }, etiquetaKey: 'toolbar.formato' });
  registrarOpcion({ esquema: { key: 'bitrateKbps', type: 'int', min: 32, max: 320, nullable: true }, etiquetaKey: 'opcion.bitrate' });
  registrarFundido();

  builtinsRegistrados = true;
}

// Definición automática al cargar (etiqueta <script> UMD): el elemento queda
// disponible en cuanto se importa la librería; en Node/SSR la guarda interna
// evita cualquier efecto. VA DESPUÉS de registrarBuiltins() por la carrera
// del upgrade del elemento estático del anfitrión (ver comentario arriba).
registrarBuiltins();
registrarElemento();

/**
 * Fábrica de alto nivel para uso como librería (sin Web Component):
 * une audios con el motor real y las estrategias de serie.
 */
export interface UnionPreparada {
  readonly merge: (entradas: readonly EntradaUnion[], opciones: Record<string, unknown>, ctx?: Partial<Pick<ContextoUnion, 'signal' | 'onProgress'>>) => ReturnType<typeof mergeTracks>;
  readonly preload: () => Promise<void>;
}

export function crearUnion(overrides?: Record<string, unknown>): UnionPreparada {
  const config = resolverConfig(overrides);
  const motor = new MotorFfmpeg(config);
  return {
    merge: (entradas, opciones, ctx) =>
      mergeTracks(entradas, opciones as Parameters<typeof mergeTracks>[1], {
        config,
        motor,
        planificador: planificarUnion,
        validadorContenedor: (bytes, formato) => {
          const f = formatosSalidaRegistrados().find((x) => x.id === formato);
          return f ? f.sniff(bytes) : false;
        },
        esquemasOpciones: esquemasOpcionesRegistradas(),
        ...ctx,
      }),
    preload: () => motor.ensureLoaded(),
  };
}
