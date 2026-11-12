import { MergeError } from '../core/errors';
import type { AudioMergerConfig } from '../config/defaults';
/** URLs efectivas del core según base autohospedada o CDN anclada. */
export interface UrlsCore {
    readonly coreURL: string;
    readonly wasmURL: string;
    readonly workerURL: string | null;
    readonly esMismoOrigen: boolean;
}
/** Soporte mínimo del navegador: Worker + WebAssembly (sin degradación silenciosa). */
export declare function comprobarSoporteNavegador(): MergeError | null;
/**
 * Decide modo (auto|single|multi) y resuelve las URLs del core.
 * - `single`: core ST de `engine.base` o de la CDN anclada.
 * - `multi`: core MT (exige crossOriginIsolated, que aporta COOP/COEP del anfitrión).
 * - `auto`: MT solo si la página está aislada; si no, ST (fallback requerido por el plan).
 *
 * Las rutas mismo-origen se ABSOLUTIZAN: el worker vive en una URL blob y las URLs
 * relativas no resuelven allí (importScripts/fetch del core fallarían con URL inválida).
 */
export declare function resolverUrlsCore(config: Readonly<AudioMergerConfig>): UrlsCore;
export declare function urlDelWorker(): string;
/** Descarga con progreso → URL blob (para recursos cross-origin). */
export declare function aBlobURL(url: string, mime: string, onProgreso?: (fraccion: number) => void): Promise<string>;
/**
 * Prepara las URLs de carga: mismo origen → URLs directas (sin copiar 32 MB a un
 * blob del hilo principal); cross-origin → URLs blob con progreso de descarga.
 */
export declare function prepararUrlsCarga(urls: UrlsCore, onDescarga?: (fraccion: number) => void): Promise<{
    coreURL: string;
    wasmURL: string;
    workerURL: string;
    revocarTrasCarga: string[];
}>;
