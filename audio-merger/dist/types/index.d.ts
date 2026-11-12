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
export { EVENTOS, } from './core/eventos';
export type * from './core/eventos';
export { mergeTracks } from './core/merge';
export type { EntradaUnion, MotorUnion, PlanificadorUnion, ContextoUnion, ResultadoSonda, ValidadorContenedor } from './core/merge';
export { esMp3, esWav, esOgg, esFlac, esM4a, SNIFFERS } from './core/validar-salida';
export { planificarUnion, esCopiaElegible, resolverBitrate } from './core/estrategias';
export { registrarFormatoEntrada, registrarFormatoSalida, registrarOpcion, registrarPostProceso, formatosEntradaRegistrados, formatosSalidaRegistrados, formatoSalida, buscarFormatoEntrada, esquemasOpcionesRegistradas, postProcesosActivos, postProcesosRegistrados, nombreInterno, reiniciarRegistros, } from './config/registry';
export type { DescriptorFormatoEntrada, DescriptorFormatoSalida, DescriptorOpcion, DescriptorPostProceso, PlanEstructural, ContextoPostProceso, } from './config/registry';
export { MotorFfmpeg } from './engine/ffmpeg';
export { registrarFundido } from './extensiones/fundido';
export { parsearLogSonda, parsearDuracion, pareceOOM } from './engine/probe';
export { comprobarSoporteNavegador, resolverUrlsCore } from './engine/loader';
export { AudioMergerElement, registrarElemento, NOMBRE_ELEMENTO as NOMBRE_WEB_COMPONENT, VERSION } from './ui/audio-merger-element';
export { leerDuracion } from './ui/metadatos';
export { calcularVentana } from './ui/lista-virtual';
import { mergeTracks, type EntradaUnion, type ContextoUnion } from './core/merge';
/** Registra los formatos/salidas/opciones de serie. Idempotente (y re-registra tras reiniciarRegistros). */
export declare function registrarBuiltins(): void;
/**
 * Fábrica de alto nivel para uso como librería (sin Web Component):
 * une audios con el motor real y las estrategias de serie.
 */
export interface UnionPreparada {
    readonly merge: (entradas: readonly EntradaUnion[], opciones: Record<string, unknown>, ctx?: Partial<Pick<ContextoUnion, 'signal' | 'onProgress'>>) => ReturnType<typeof mergeTracks>;
    readonly preload: () => Promise<void>;
}
export declare function crearUnion(overrides?: Record<string, unknown>): UnionPreparada;
