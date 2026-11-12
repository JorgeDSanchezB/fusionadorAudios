/**
 * Motor ffmpeg.wasm real (FASE 4): implementa `MotorUnion` (contrato FASE 3).
 *
 * - Carga diferida (D-02): el worker y el core se crean en el primer uso.
 * - Entradas montadas con WORKERFS (D-05): los File del usuario NO se copian a RAM.
 * - Sonda multi-entrada en UNA ejecución (D-09).
 * - Cancelación: terminate() del worker + rechazo de pendientes (D-14); el siguiente
 *   uso recarga el motor (el core vuelve por HTTP cache del navegador).
 * - Salida: MEMFS → readFile → transferencia sin copia; unlink tras leer.
 */
import { MergeError, toMergeError } from '../core/errors';
import type { EntradaUnion, MotorUnion, ResultadoSonda } from '../core/merge';
import type { MergePlan, ProbeInfo } from '../core/types';
import type { AudioMergerConfig } from '../config/defaults';
import { extensionSegura } from '../core/tracks';
import { nombreInterno } from '../config/registry';
import { RUTA_ENTRADA, RUTA_SALIDA } from '../core/estrategias';
import { aBlobURL, comprobarSoporteNavegador, prepararUrlsCarga, resolverUrlsCore, urlDelWorker } from './loader';
import { parsearDuracion, parsearLogSonda, pareceOOM } from './probe';

interface MensajeAlWorker {
  readonly id: number;
  readonly tipo: 'load' | 'exec' | 'mount' | 'unmount' | 'write' | 'read' | 'delete';
  readonly datos?: unknown;
}

interface MensajeDelWorker {
  readonly id?: number;
  readonly tipo: 'ok' | 'error' | 'log' | 'progress';
  readonly datos?: unknown;
}

interface Pendiente {
  resolve: (valor: unknown) => void;
  reject: (error: Error) => void;
}

const MONTAJE_ENTRADA = RUTA_ENTRADA;
const DIR_SALIDA = RUTA_SALIDA;
const MONTAJE_MEDICION = '/medicion';
/** Tamaño del búfer de líneas de log retenidas para diagnóstico de errores. */
const LINEAS_LOG_RETENIDAS = 400;

export class MotorFfmpeg implements MotorUnion {
  private worker: Worker | null = null;
  private cargado = false;
  private promesaCarga: Promise<void> | null = null;
  private pendientes = new Map<number, Pendiente>();
  private idSiguiente = 1;
  private lineasLog: string[] = [];
  private oyenteLog: ((linea: string) => void) | null = null;
  private oyenteProgreso: ((datos: { progress: number; time: number }) => void) | null = null;

  constructor(private readonly config: Readonly<AudioMergerConfig>) {}

  /** Líneas de log retenidas (diagnóstico visible en errores del motor). */
  obtenerLog(): readonly string[] {
    return this.lineasLog;
  }

  async ensureLoaded(onDescarga?: (fraccion: number) => void): Promise<void> {
    if (this.cargado) return;
    if (this.promesaCarga) return this.promesaCarga;

    const soporte = comprobarSoporteNavegador();
    if (soporte) throw soporte;

    // Modo multi EXPLÍCITO sin aislamiento de origen: error claro y temprano
    // (COOP/COEP del anfitrión), no un fallo críptico del core más tarde.
    if (this.config.engine.mode === 'multi' && (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated !== true) {
      throw new MergeError({
        code: 'WASM_LOAD_FAILED',
        message: 'engine-mode=multi exige una página aislada (cabeceras COOP/COEP del anfitrión); usa auto o single, o sirve las cabeceras',
        details: { modo: 'multi', crossOriginIsolated: false },
      });
    }

    this.promesaCarga = (async () => {
      const urls = resolverUrlsCore(this.config);
      const preparadas = await prepararUrlsCarga(urls, onDescarga);
      try {
        const worker = this.crearWorker();
        await this.enviar('load', { coreURL: preparadas.coreURL, wasmURL: preparadas.wasmURL, workerURL: preparadas.workerURL }, worker);
        this.cargado = true;
      } catch (e) {
        this.destruirWorker();
        throw toMergeError(e, 'WASM_LOAD_FAILED');
      } finally {
        // Ciclo de vida de object URLs (D-02): las del core se revocan tras la carga.
        for (const url of preparadas.revocarTrasCarga) URL.revokeObjectURL(url);
      }
    })();
    try {
      await this.promesaCarga;
    } finally {
      this.promesaCarga = null;
    }
  }

  async sondear(entradas: readonly EntradaUnion[]): Promise<readonly ResultadoSonda[]> {
    const rutas = await this.montar(entradas);
    try {
      return await this.sondearMontadas(entradas, rutas);
    } finally {
      await this.desmontar().catch(() => undefined);
    }
  }

  private async sondearMontadas(entradas: readonly EntradaUnion[], rutas: readonly string[]): Promise<readonly ResultadoSonda[]> {
    const args = ['-hide_banner'];
    for (const ruta of rutas) args.push('-i', ruta);
    // Decodifica ≤50 ms de la primera entrada: basta para abrir TODOS los inputs
    // (los bloques Input/Stream se imprimen al abrir cada uno) con salida correcta.
    args.push('-t', '0.05', '-f', 'null', '-');

    const lineas: string[] = [];
    this.lineasLog = lineas;
    this.oyenteLog = (linea) => lineas.push(linea);
    try {
      await this.enviar('exec', { args, timeout: -1 });
    } catch (e) {
      throw this.clasificarFalloEjecucion(e, 'PROBE_FAILED');
    } finally {
      this.oyenteLog = null;
    }

    let log = parsearLogSonda(lineas);
    // Si ffmpeg abortó al fallar una entrada (típicamente la PRIMERA corrupta), las
    // sanas quedan sin bloque: re-sondeamos INDIVIDUALMENTE las rutas sin bloque
    // para aislar al culpable (verificado con ffmpeg real: al fallar el primer
    // input, el resto ni se abre).
    const sinBloque = entradas.map((_, i) => i).filter((i) => !log.bloques.has(rutas[i]!));
    if (sinBloque.length > 0) {
      const bloques = new Map(log.bloques);
      let abiertas = 0;
      for (const i of sinBloque) {
        const individuales: string[] = [];
        this.oyenteLog = (linea) => individuales.push(linea);
        try {
          await this.enviar('exec', { args: ['-hide_banner', '-i', rutas[i]!, '-t', '0.05', '-f', 'null', '-'], timeout: -1 }).catch(() => undefined);
        } finally {
          this.oyenteLog = null;
        }
        const logIndividual = parsearLogSonda(individuales);
        if (logIndividual.bloques.size > 0) abiertas += logIndividual.bloques.size;
        for (const [ruta, bloque] of logIndividual.bloques) bloques.set(ruta, bloque);
      }
      log = { bloques, huboErrorApertura: log.huboErrorApertura };
      // Ninguna abrió NI individualmente (falla genérica de sonda, no archivos corruptos).
      if (sinBloque.length === entradas.length && abiertas === 0 && entradas.length > 1) {
        throw new MergeError({
          code: 'PROBE_FAILED',
          message: `la sonda no pudo abrir ninguna de las ${entradas.length} entradas`,
          details: { n: entradas.length },
        });
      }
    }

    const resultados: ResultadoSonda[] = entradas.map((e, i) => {
      const ruta = rutas[i]!;
      const bloque = log.bloques.get(ruta);
      if (bloque && 'info' in bloque) return { id: e.id, info: bloque.info };
      if (bloque && 'sinAudio' in bloque) {
        return {
          id: e.id,
          error: new MergeError({
            code: 'UNSUPPORTED_FORMAT',
            message: `${e.name}: el archivo no contiene audio decodificable`,
            details: { nombre: e.name },
          }),
        };
      }
      // Sin bloque Input ni reapertura: no se pudo abrir → corrupto.
      return {
        id: e.id,
        error: new MergeError({
          code: 'CORRUPT_FILE',
          message: `${e.name}: no se pudo abrir (datos inválidos)`,
          details: { nombre: e.name },
        }),
      };
    });
    return resultados;
  }

  async ejecutar(
    plan: MergePlan,
    entradas: readonly EntradaUnion[],
    onFraccion?: (fraccion: number) => void,
  ): Promise<Uint8Array> {
    const rutas = await this.montar(entradas);
    try {
      return await this.ejecutarMontadas(plan, onFraccion);
    } finally {
      await this.desmontar().catch(() => undefined);
    }
  }

  private async ejecutarMontadas(plan: MergePlan, onFraccion?: (fraccion: number) => void): Promise<Uint8Array> {
    if (plan.listaConcat) {
      const contenido = `${plan.listaConcat.join('\n')}\n`;
      await this.enviar('write', { ruta: `${DIR_SALIDA}/list.txt`, datos: contenido });
    }

    const lineas: string[] = [];
    this.lineasLog = lineas;
    this.oyenteLog = (linea) => lineas.push(linea);
    const microsEsperados = plan.expectedDurationMs !== null ? plan.expectedDurationMs * 1000 : null;
    this.oyenteProgreso = ({ time, progress }) => {
      if (microsEsperados && time > 0) onFraccion?.(Math.min(1, time / microsEsperados));
      else if (typeof progress === 'number' && progress > 0) onFraccion?.(Math.min(1, progress));
    };

    let bytes: Uint8Array;
    try {
      const ret = (await this.enviar('exec', { args: [...plan.args], timeout: -1 })) as number;
      if (ret !== 0 && pareceOOM(lineas)) {
        throw new MergeError({
          code: 'OUT_OF_MEMORY',
          message: `ffmpeg agotó la memoria (ret=${ret}); últimas líneas: ${lineas.slice(-5).join(' | ')}`,
          details: { ret },
        });
      }
      if (ret !== 0) {
        throw new MergeError({
          code: 'UNKNOWN_ENGINE_ERROR',
          message: `ffmpeg terminó con código ${ret}; últimas líneas: ${lineas.slice(-5).join(' | ')}`,
          details: { ret },
        });
      }
      bytes = (await this.enviar('read', { ruta: plan.outputInternalName })) as Uint8Array;
    } catch (e) {
      throw this.clasificarFalloEjecucion(e, 'UNKNOWN_ENGINE_ERROR');
    } finally {
      this.oyenteLog = null;
      this.oyenteProgreso = null;
    }

    // Limpieza del FS: salida leída → unlink (libera MEMFS, D-05); ídem lista concat.
    await this.enviar('delete', { ruta: plan.outputInternalName }).catch(() => undefined);
    if (plan.listaConcat) await this.enviar('delete', { ruta: `${DIR_SALIDA}/list.txt` }).catch(() => undefined);
    return bytes;
  }

  async medirDuracion(blob: Blob): Promise<number | null> {
    // ffprobe-lite: -i <archivo> imprime Duration al abrir cabeceras (sin decodificar).
    // Salida con error esperada ("At least one output file must be specified"): el
    // código de retorno se ignora y manda el log; el core se resetea en el worker.
    const montaje = MONTAJE_MEDICION;
    const archivo = new File([blob], 'medicion', { type: blob.type });
    const disponible = (await this.enviar('mount', { fsType: 'WORKERFS', options: { files: [archivo] }, mountPoint: montaje })) as { disponible: boolean };
    if (!disponible.disponible) {
      throw new MergeError({ code: 'WORKERFS_UNAVAILABLE', message: 'WORKERFS no está disponible en este core' });
    }
    const lineas: string[] = [];
    this.lineasLog = lineas;
    this.oyenteLog = (linea) => lineas.push(linea);
    try {
      await this.enviar('exec', { args: ['-hide_banner', '-i', `${montaje}/medicion`], timeout: -1 }).catch(() => undefined);
    } finally {
      this.oyenteLog = null;
    }
    await this.enviar('unmount', { mountPoint: montaje }).catch(() => undefined);
    return parsearDuracion(lineas);
  }

  cancelar(): void {
    // D-14: terminate + rechazo de pendientes; el siguiente uso recarga.
    for (const [, p] of this.pendientes) {
      p.reject(new DOMException('motor cancelado', 'AbortError'));
    }
    this.pendientes.clear();
    this.destruirWorker();
    this.cargado = false;
  }

  dispose(): void {
    this.cancelar();
  }

  // ——— internos ———

  private crearWorker(): Worker {
    this.destruirWorker();
    const worker = new Worker(urlDelWorker());
    worker.onmessage = (ev: MessageEvent<MensajeDelWorker>) => {
      const m = ev.data;
      if (m.tipo === 'log') {
        const datos = m.datos as { type?: string; message?: string } | undefined;
        const linea = datos?.message ?? '';
        if (linea) {
          this.lineasLog.push(linea);
          if (this.lineasLog.length > LINEAS_LOG_RETENIDAS) this.lineasLog.splice(0, this.lineasLog.length - LINEAS_LOG_RETENIDAS);
          this.oyenteLog?.(linea);
        }
        return;
      }
      if (m.tipo === 'progress') {
        this.oyenteProgreso?.(m.datos as { progress: number; time: number });
        return;
      }
      const id = m.id ?? 0;
      const pendiente = this.pendientes.get(id);
      if (!pendiente) return;
      this.pendientes.delete(id);
      if (m.tipo === 'ok') pendiente.resolve(m.datos);
      else pendiente.reject(new Error(String(m.datos ?? 'error del motor')));
    };
    worker.onerror = (ev: ErrorEvent) => {
      // Error de script del worker (CSP, red): clasifica como fallo de carga.
      const error = new Error(`worker del motor: ${ev.message}`);
      for (const [, p] of this.pendientes) p.reject(error);
      this.pendientes.clear();
      this.destruirWorker();
      this.cargado = false;
    };
    this.worker = worker;
    return worker;
  }

  private destruirWorker(): void {
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }
    this.cargado = false;
  }

  private enviar(tipo: MensajeAlWorker['tipo'], datos: unknown, worker?: Worker): Promise<unknown> {
    const w = worker ?? this.worker;
    if (!w) return Promise.reject(new MergeError({ code: 'WASM_LOAD_FAILED', message: 'motor no inicializado' }));
    const id = this.idSiguiente++;
    return new Promise((resolve, reject) => {
      this.pendientes.set(id, { resolve, reject });
      w.postMessage({ id, tipo, datos } satisfies MensajeAlWorker);
    });
  }

  private async montar(entradas: readonly EntradaUnion[]): Promise<readonly string[]> {
    await this.ensureLoaded();
    await this.desmontar().catch(() => undefined);
    const n = entradas.length;
    const archivos: File[] = [];
    const rutas: string[] = [];
    for (let i = 0; i < n; i++) {
      const e = entradas[i]!;
      const ext = extensionSegura(e.name);
      const interno = nombreInterno(i, ext, n);
      rutas.push(`${MONTAJE_ENTRADA}/${interno}`);
      archivos.push(new File([e.blob], interno, { type: e.blob.type }));
    }
    const disponible = (await this.enviar('mount', { fsType: 'WORKERFS', options: { files: archivos }, mountPoint: MONTAJE_ENTRADA })) as { disponible: boolean };
    if (!disponible.disponible) {
      throw new MergeError({
        code: 'WORKERFS_UNAVAILABLE',
        message: 'WORKERFS no está registrado en este core: las entradas no se pueden transmitir',
        details: {},
      });
    }
    return rutas;
  }

  private async desmontar(): Promise<void> {
    await this.enviar('unmount', { mountPoint: MONTAJE_ENTRADA }).catch(() => undefined);
  }

  private clasificarFalloEjecucion(e: unknown, codigo: 'PROBE_FAILED' | 'UNKNOWN_ENGINE_ERROR'): MergeError {
    if (e instanceof MergeError) return e;
    const err = toMergeError(e, codigo);
    if (pareceOOM(this.lineasLog)) {
      return new MergeError({
        code: 'OUT_OF_MEMORY',
        message: `ffmpeg agotó la memoria; últimas líneas: ${this.lineasLog.slice(-5).join(' | ')}`,
        cause: e,
      });
    }
    return err;
  }
}
