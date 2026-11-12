/**
 * Cargador del motor ffmpeg.wasm (D-02): DIFERIDO, nunca en el arranque.
 * Solo se invoca desde merge()/preloadEngine().
 */
import { CODIGO_WORKER } from './worker-source';
import { MergeError } from '../core/errors';
import type { AudioMergerConfig } from '../config/defaults';

/** URLs efectivas del core según base autohospedada o CDN anclada. */
export interface UrlsCore {
  readonly coreURL: string;
  readonly wasmURL: string;
  readonly workerURL: string | null;
  readonly esMismoOrigen: boolean;
}

const RUTAS_ST = { js: 'core/ffmpeg-core.js', wasm: 'core/ffmpeg-core.wasm' } as const;
const RUTAS_MT = { js: 'core-mt/ffmpeg-core.js', wasm: 'core-mt/ffmpeg-core.wasm', worker: 'core-mt/ffmpeg-core.worker.js' } as const;

function esMismoOrigen(url: string): boolean {
  if (url.startsWith('/')) return true;
  try {
    return new URL(url, globalThis.location.href).origin === globalThis.location.origin;
  } catch {
    return false;
  }
}

/** Soporte mínimo del navegador: Worker + WebAssembly (sin degradación silenciosa). */
export function comprobarSoporteNavegador(): MergeError | null {
  const g = globalThis as { Worker?: unknown; WebAssembly?: unknown; fetch?: unknown };
  if (typeof g.Worker === 'undefined' || typeof g.WebAssembly === 'undefined' || typeof g.fetch === 'undefined') {
    return new MergeError({
      code: 'BROWSER_UNSUPPORTED',
      message: 'el navegador no soporta Worker/WebAssembly/fetch',
      details: { worker: typeof g.Worker !== 'undefined', wasm: typeof g.WebAssembly !== 'undefined', fetch: typeof g.fetch !== 'undefined' },
    });
  }
  return null;
}

/**
 * Decide modo (auto|single|multi) y resuelve las URLs del core.
 * - `single`: core ST de `engine.base` o de la CDN anclada.
 * - `multi`: core MT (exige crossOriginIsolated, que aporta COOP/COEP del anfitrión).
 * - `auto`: MT solo si la página está aislada; si no, ST (fallback requerido por el plan).
 *
 * Las rutas mismo-origen se ABSOLUTIZAN: el worker vive en una URL blob y las URLs
 * relativas no resuelven allí (importScripts/fetch del core fallarían con URL inválida).
 */
export function resolverUrlsCore(config: Readonly<AudioMergerConfig>): UrlsCore {
  const absolutizar = (url: string): string => {
    if (!url.startsWith('/') || typeof globalThis.location === 'undefined') return url;
    return new URL(url, globalThis.location.href).href;
  };
  const modo =
    config.engine.mode === 'multi'
      ? 'multi'
      : config.engine.mode === 'single'
        ? 'single'
        : (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true
          ? 'multi'
          : 'single';

  const base = config.engine.base;
  if (base) {
    const prefijo = base.endsWith('/') ? base : `${base}/`;
    if (modo === 'multi') {
      return {
        coreURL: absolutizar(`${prefijo}${RUTAS_MT.js}`),
        wasmURL: absolutizar(`${prefijo}${RUTAS_MT.wasm}`),
        workerURL: absolutizar(`${prefijo}${RUTAS_MT.worker}`),
        esMismoOrigen: esMismoOrigen(prefijo),
      };
    }
    return {
      coreURL: absolutizar(`${prefijo}${RUTAS_ST.js}`),
      wasmURL: absolutizar(`${prefijo}${RUTAS_ST.wasm}`),
      workerURL: null,
      esMismoOrigen: esMismoOrigen(prefijo),
    };
  }
  const cdn = config.engine.cdn;
  if (modo === 'multi') {
    return { coreURL: cdn.coreMtJs, wasmURL: cdn.coreMtWasm, workerURL: cdn.coreWorkerJs, esMismoOrigen: false };
  }
  return { coreURL: cdn.coreJs, wasmURL: cdn.coreWasm, workerURL: null, esMismoOrigen: false };
}

/** URL blob del worker (una sola por página; ~2 KB, reutilizable). */
let urlWorkerCache: string | null = null;

export function urlDelWorker(): string {
  if (urlWorkerCache === null) {
    const blob = new Blob([CODIGO_WORKER], { type: 'text/javascript' });
    urlWorkerCache = URL.createObjectURL(blob);
  }
  return urlWorkerCache;
}

/** Descarga con progreso → URL blob (para recursos cross-origin). */
export async function aBlobURL(url: string, mime: string, onProgreso?: (fraccion: number) => void): Promise<string> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new MergeError({
      code: 'WASM_LOAD_FAILED',
      message: `descarga fallida ${respuesta.status} ${respuesta.statusText} de ${url}`,
      details: { url, estado: respuesta.status },
    });
  }
  const total = Number(respuesta.headers.get('content-length') ?? 0);
  const lector = respuesta.body?.getReader();
  if (!lector || total <= 0) {
    // Sin streaming o sin longitud: descarga completa sin progreso fino.
    const buffer = await respuesta.arrayBuffer();
    onProgreso?.(1);
    return URL.createObjectURL(new Blob([buffer], { type: mime }));
  }
  const trozos: Uint8Array[] = [];
  let recibidos = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    if (value) {
      trozos.push(value);
      recibidos += value.length;
      onProgreso?.(Math.min(1, recibidos / total));
    }
  }
  const completo = new Uint8Array(recibidos);
  let posicion = 0;
  for (const trozo of trozos) {
    completo.set(trozo, posicion);
    posicion += trozo.length;
  }
  return URL.createObjectURL(new Blob([completo as unknown as BlobPart], { type: mime }));
}

/**
 * Prepara las URLs de carga: mismo origen → URLs directas (sin copiar 32 MB a un
 * blob del hilo principal); cross-origin → URLs blob con progreso de descarga.
 */
export async function prepararUrlsCarga(
  urls: UrlsCore,
  onDescarga?: (fraccion: number) => void,
): Promise<{ coreURL: string; wasmURL: string; workerURL: string; revocarTrasCarga: string[] }> {
  if (urls.esMismoOrigen) {
    onDescarga?.(1); // mismo origen: el coste de red es mínimo; progreso grueso.
    return {
      coreURL: urls.coreURL,
      wasmURL: urls.wasmURL,
      workerURL: urls.workerURL ?? '',
      revocarTrasCarga: [],
    };
  }
  const coreURL = await aBlobURL(urls.coreURL, 'text/javascript');
  const wasmURL = await aBlobURL(urls.wasmURL, 'application/wasm', (f) => onDescarga?.(f * 0.98));
  onDescarga?.(1);
  const workerURL = urls.workerURL ? await aBlobURL(urls.workerURL, 'text/javascript') : '';
  return { coreURL, wasmURL, workerURL, revocarTrasCarga: [coreURL, wasmURL, ...(workerURL ? [workerURL] : [])] };
}
