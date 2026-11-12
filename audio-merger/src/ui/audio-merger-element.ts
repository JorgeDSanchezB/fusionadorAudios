/**
 * <audio-merger> (FASE 5): Web Component con Shadow DOM.
 *
 * Estructura (Átomos → Moléculas → Organismos, ver docs/rendering.md):
 * zona de carga · barra de herramientas · lista (con virtualización condicional) ·
 * barra de estado aria-live · panel de resultado · panel de error · diálogo de aviso.
 *
 * Estado: reducer puro (core/reducer.ts, D-03). Re-render por regiones: la lista
 * se reconcilia POR CLAVE (id) reutilizando filas; el resto solo cuando cambia.
 * Accesibilidad: botones ↑/↓ siempre visibles, aria-live para progreso/avisos,
 * foco gestionado tras eliminar/mover, DnD con semántica ARIA.
 */
import { MergeError, toMergeError, type ErrorCode } from '../core/errors';
import type { AudioTrack, MergeJob, MergeOptions, MergeOutput, WarningCode } from '../core/types';
import { estadoInicial, reducer, seleccionarPistasUnibles, type EstadoComponente, type ResultadoUI } from '../core/reducer';
import { ATRIBUTOS, parseAtributos } from '../config/atributos';
import { DEFAULT_CONFIG, RETRYABLE_CODES, type AudioMergerConfig } from '../config/defaults';
import { resolverConfig } from '../config/validate';
import { buscarFormatoEntrada, esquemasOpcionesRegistradas, formatosEntradaRegistrados, formatosSalidaRegistrados, formatoSalida } from '../config/registry';
import { planificarUnion } from '../core/estrategias';
import { mergeTracks, type EntradaUnion } from '../core/merge';
import { MotorFfmpeg } from '../engine/ffmpeg';
import { comprobarMinimoPistas, extensionDe, seleccionarAdmisibles, totalesDeLista, validarArchivoEntrada } from '../core/tracks';
import { estimarSalida, razonesDeAviso } from '../core/estimacion';
import { EVENTOS } from '../core/eventos';
import { t, fijarLocale } from '../i18n';
import { crearId } from '../utils/id';
import { formatearBytes, formatearDuracion, formatearPorcentaje } from '../utils/format';
import { leerDuracion } from './metadatos';
import { calcularVentana } from './lista-virtual';
import { ESTILOS } from './estilos';

const ICONOS = {
  onda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12h2l2-6 3 12 3-16 3 16 2-6h3"/></svg>',
  subir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  quitar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  descargar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>',
  mango: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  aviso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>',
} as const;

export const VERSION = '1.0.0';
export const NOMBRE_ELEMENTO = 'audio-merger';

/** Etiquetas de usuario para los MIME del resultado: «audio/mpeg» no dice
 *  nada a quien solo quiere saber si su archivo es MP3. */
const ETIQUETAS_MIME: Record<string, string> = {
  'audio/mpeg': 'MP3', 'audio/mp3': 'MP3',
  'audio/wav': 'WAV', 'audio/x-wav': 'WAV', 'audio/wave': 'WAV', 'audio/vnd.wave': 'WAV',
  'audio/ogg': 'OGG', 'application/ogg': 'OGG', 'audio/vorbis': 'OGG',
  'audio/flac': 'FLAC', 'audio/x-flac': 'FLAC',
  'audio/mp4': 'M4A', 'audio/m4a': 'M4A', 'audio/x-m4a': 'M4A',
  'audio/aac': 'AAC', 'audio/webm': 'WebM',
};
const etiquetaMime = (mime: string): string => ETIQUETAS_MIME[mime] ?? mime;

/** Base del elemento: HTMLElement real o clase neutra en entornos sin DOM (Node).
 *  Así la librería puede importarse en Node (tests/SSR) sin definir el custom element. */
const BaseElement: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement);

export class AudioMergerElement extends BaseElement {
  static get observedAttributes(): readonly string[] {
    return ATRIBUTOS.map((a) => a.nombre);
  }

  private estado: EstadoComponente = estadoInicial({ format: 'mp3', bitrateKbps: 192, fadeMs: 0 });
  private config: Readonly<AudioMergerConfig> = DEFAULT_CONFIG;
  private motor: MotorFfmpeg | null = null;
  private controlador: AbortController | null = null;
  private archivos = new Map<string, File>();
  private sombra: ShadowRoot | null = null;
  private hoja: CSSStyleSheet | null = null;
  private filas = new Map<string, HTMLLIElement>();
  private idArrastrandose: string | null = null;
  private avisoResolver: ((continuar: boolean) => void) | null = null;
  /** true mientras una unión está en vuelo (incluye el diálogo de aviso): un solo job. */
  private unionEnCurso = false;

  constructor() {
    super();
    this.attachShadowIfPossible();
  }

  private attachShadowIfPossible(): void {
    if (typeof ShadowRoot !== 'undefined' && this.shadowRoot === null) {
      this.sombra = this.attachShadow({ mode: 'open' });
    } else {
      this.sombra = this.shadowRoot;
    }
  }

  connectedCallback(): void {
    if (!this.sombra) this.attachShadowIfPossible();
    if (!this.sombra) return;
    // Hoja adoptada si el entorno la soporta; si no, <style> clásico (mismo aislamiento).
    try {
      this.hoja = new CSSStyleSheet();
      this.hoja.replaceSync(ESTILOS);
      this.sombra.adoptedStyleSheets = [this.hoja];
    } catch {
      const estilo = document.createElement('style');
      estilo.textContent = ESTILOS;
      this.sombra.appendChild(estilo);
    }
    this.aplicarAtributos();
    this.renderizarCompleto();
  }

  disconnectedCallback(): void {
    // Diferido: al MOVER el elemento en el DOM también se dispara; solo limpiamos
    // si el elemento sigue desconectado tras el ciclo de eventos.
    setTimeout(() => {
      if (this.isConnected) return;
      this.controlador?.abort();
      if (this.estado.resultado) this.revocarURL(this.estado.resultado.url);
    }, 0);
  }

  attributeChangedCallback(_nombre: string, viejo: string | null, nuevo: string | null): void {
    if (viejo === nuevo || !this.sombra) return;
    this.aplicarAtributos();
    this.renderizarCompleto();
  }

  // ——— Atributos → config/opciones (tabla declarativa, FASE 3) ———

  private leerAtributos(): { overridesConfig: Record<string, unknown>; opciones: Record<string, unknown>; estructural: Record<string, unknown> } {
    const presentes: Record<string, string | null> = {};
    for (const a of ATRIBUTOS) presentes[a.nombre] = this.getAttribute(a.nombre);
    return parseAtributos(presentes);
  }

  private aplicarAtributos(): void {
    let leidos: { overridesConfig: Record<string, unknown>; opciones: Record<string, unknown>; estructural: Record<string, unknown> };
    try {
      leidos = this.leerAtributos();
    } catch (e) {
      const err = toMergeError(e, 'CONFIG_INVALID');
      this.estado = reducer(this.estado, { tipo: 'ERROR', error: err });
      this.emitir(EVENTOS.error, { code: err.code, message: err.message, details: err.details });
      return;
    }
    const { overridesConfig, opciones, estructural } = leidos;
    try {
      this.config = resolverConfig(overridesConfig);
    } catch (e) {
      const err = toMergeError(e, 'CONFIG_INVALID');
      this.estado = reducer(this.estado, { tipo: 'ERROR', error: err });
      this.emitir(EVENTOS.error, { code: err.code, message: err.message, details: err.details });
      return;
    }
    fijarLocale(this.config.i18n.locale);
    // El motor NO se recrea con una unión en vuelo (rompería la operación);
    // los cambios de atributo de motor se aplican en el siguiente uso.
    if (!this.unionEnCurso || !this.motor) this.motor = new MotorFfmpeg(this.config);
    // Opciones con valores por defecto de los descriptores de salida (primer
    // formato registrado; 'mp3' solo como fallback degenerado sin registros).
    const formatoPorDefecto = formatosSalidaRegistrados()[0]?.id ?? 'mp3';
    const formato = formatoSalida(String(opciones.format ?? formatoPorDefecto));
    const opcionesCompletas: Record<string, unknown> = { ...opciones };
    if (!('format' in opcionesCompletas)) opcionesCompletas.format = formatoPorDefecto;
    if (!('bitrateKbps' in opcionesCompletas)) opcionesCompletas.bitrateKbps = formato?.bitratePorDefecto ?? null;
    if (!('fadeMs' in opcionesCompletas)) opcionesCompletas.fadeMs = 0;
    try {
      const merged = { ...this.estado.opciones, ...opcionesCompletas } as MergeOptions;
      this.estado = reducer(this.estado, { tipo: 'FIJAR_OPCIONES', opciones: merged });
    } catch {
      // FIJAR_OPCIONES no lanza; se mantiene el estado previo (la validación real
      // ocurre en merge() con INVALID_OPTIONS accionable).
    }
    this.estructural = estructural;
  }

  private estructural: Record<string, unknown> = {};

  // ——— API pública (FASE 3) ———

  get tracks(): readonly AudioTrack[] {
    return this.estado.orden.map((id) => this.estado.porId.get(id)!);
  }

  get options(): MergeOptions {
    return this.estado.opciones;
  }

  get state(): 'idle' | 'analyzing' | 'running' | 'completed' | 'error' | 'cancelled' {
    if (this.estado.job?.status === 'running') return 'running';
    if (this.estado.resultado) return 'completed';
    if (this.estado.error) return this.estado.error.code === 'USER_CANCELLED' ? 'cancelled' : 'error';
    if (this.estado.orden.some((id) => this.estado.porId.get(id)?.status === 'analyzing')) return 'analyzing';
    return 'idle';
  }

  get result(): MergeOutput | null {
    const r = this.estado.resultado;
    if (!r) return null;
    return {
      blob: r.blob,
      name: r.name,
      mimeType: r.mimeType,
      size: r.size,
      durationMs: r.durationMs,
      strategy: r.strategy,
      warnings: r.warnings.map((w) => ({ code: w.code as WarningCode, message: w.message, params: w.params })),
    };
  }

  get version(): string {
    return VERSION;
  }

  async addFiles(entrada: FileList | File[] | File): Promise<readonly AudioTrack[]> {
    const archivos = entrada instanceof FileList || Array.isArray(entrada) ? Array.from(entrada as ArrayLike<File>) : [entrada];
    const parejas: { archivo: File; pista: AudioTrack }[] = [];
    const rechazos: { pista: string; error: MergeError }[] = [];
    const formatos = formatosEntradaRegistrados();

    for (const archivo of archivos) {
      const error = validarArchivoEntrada(archivo, formatos, this.config.limits);
      if (error) {
        rechazos.push({ pista: archivo.name, error });
        continue;
      }
      const formato = buscarFormatoEntrada(archivo.name, archivo.type);
      parejas.push({
        archivo,
        pista: {
          id: crearId(),
          createdAt: Date.now(),
          name: archivo.name,
          size: archivo.size,
          mimeType: archivo.type,
          extension: extensionDe(archivo.name) || formato?.id || 'bin',
          durationMs: null,
          status: 'analyzing',
          probed: null,
        },
      });
    }

    const actuales = this.estado.orden.map((id) => this.estado.porId.get(id)!);
    const admision = seleccionarAdmisibles(parejas.map((p) => p.pista), actuales, this.config.limits);
    for (const r of admision.rechazadas) rechazos.push({ pista: r.pista.name, error: r.error });

    if (admision.admitidas.length > 0) {
      // Asociación archivo↔pista por POSICIÓN (parejas): dos archivos con el mismo
      // nombre y tamaño NO pueden cruzarse (regresión de homónimos).
      for (const pareja of parejas) {
        if (admision.admitidas.includes(pareja.pista)) this.archivos.set(pareja.pista.id, pareja.archivo);
      }
      this.estado = reducer(this.estado, { tipo: 'ANADIR_PISTAS', pistas: admision.admitidas });
      this.anunciar(t('a11y.anadidas', { n: admision.admitidas.length }));
      for (const pista of admision.admitidas) {
        this.emitir(EVENTOS.pistaAnadida, { pista });
        void this.completarDuracion(pista.id);
      }
    }
    for (const r of rechazos) {
      this.anunciar(t('a11y.rechazada', { nombre: r.pista, motivo: this.mensajeDeError(r.error, false) }));
      this.emitir(EVENTOS.error, { code: r.error.code, message: r.error.message, details: { ...r.error.details, nombre: r.pista } });
    }
    this.renderizarHerramientas();
    this.renderizarLista();
    this.renderizarEstado();
    return admision.admitidas;
  }

  removeTrack(id: string): boolean {
    const pista = this.estado.porId.get(id);
    if (!pista) return false;
    const indiceEliminada = this.estado.orden.indexOf(id);
    this.estado = reducer(this.estado, { tipo: 'QUITAR_PISTA', id });
    this.archivos.delete(id);
    // El nodo DOM lo retira el bucle de huérfanas de renderizarLista (regresión del
    // árbitro final: borrar del mapa AQUÍ dejaba filas fantasma en el DOM).
    this.anunciar(t('a11y.quitada', { nombre: pista.name || t('pista.nombreVacio') }));
    this.emitir(EVENTOS.pistaQuitada, { id, pista });
    this.renderizarHerramientas();
    this.renderizarLista();
    this.renderizarEstado();
    this.devolverFoco(indiceEliminada);
    return true;
  }

  reorder(de: number, a: number): readonly string[] {
    this.estado = reducer(this.estado, { tipo: 'MOVER', de, a });
    this.emitir(EVENTOS.reordenado, { orden: [...this.estado.orden], de, a, origen: 'api' });
    this.renderizarLista();
    return [...this.estado.orden];
  }

  moveTrack(id: string, delta: number): readonly string[] {
    const indice = this.estado.orden.indexOf(id);
    this.estado = reducer(this.estado, { tipo: 'MOVER_ID', id, delta });
    const pista = this.estado.porId.get(id);
    if (pista && indice >= 0) {
      this.anunciar(t('a11y.movida', { nombre: pista.name || t('pista.nombreVacio'), pos: this.estado.orden.indexOf(id) + 1 }));
    }
    this.emitir(EVENTOS.reordenado, { orden: [...this.estado.orden], de: indice, a: this.estado.orden.indexOf(id), origen: 'api' });
    this.renderizarLista();
    return [...this.estado.orden];
  }

  setOptions(parcial: Partial<MergeOptions>): MergeOptions {
    const combinadas = { ...this.estado.opciones, ...parcial } as MergeOptions;
    this.estado = reducer(this.estado, { tipo: 'FIJAR_OPCIONES', opciones: combinadas });
    this.emitir(EVENTOS.opcionesCambiadas, { opciones: combinadas });
    this.renderizarHerramientas();
    return combinadas;
  }

  reset(): void {
    // Con aviso abierto: se cierra cancelando.
    this.avisoResolver?.(false);
    // Con un job en vuelo, reiniciar implica cancelarlo primero.
    if (this.unionEnCurso) this.cancel();
    if (this.estado.resultado) this.revocarURL(this.estado.resultado.url);
    this.estado = reducer(this.estado, { tipo: 'REINICIAR' });
    this.renderizarHerramientas();
    this.renderizarLista();
    this.renderizarEstado();
    this.renderizarResultado();
  }

  clear(): void {
    // Con aviso abierto: se cierra cancelando (la promesa pendiente no queda colgada).
    this.avisoResolver?.(false);
    // Con un job en vuelo, vaciar implica cancelarlo primero (intención explícita
    // del usuario/API; la promesa del job rechazará con USER_CANCELLED).
    if (this.unionEnCurso) this.cancel();
    if (this.estado.resultado) this.revocarURL(this.estado.resultado.url);
    this.estado = reducer(this.estado, { tipo: 'LIMPIAR_LISTA' });
    this.archivos.clear();
    // Los nodos DOM y el mapa de filas los limpia renderizarLista (rama vacía):
    // vaciar el mapa aquí dejaba filas fantasma (regresión del árbitro final).
    this.renderizarHerramientas();
    this.renderizarLista();
    this.renderizarEstado();
    this.renderizarResultado();
  }

  async preloadEngine(): Promise<void> {
    if (!this.motor) this.motor = new MotorFfmpeg(this.config);
    await this.motor.ensureLoaded();
  }

  async merge(): Promise<MergeOutput> {
    return this.ejecutarUnion();
  }

  cancel(): void {
    this.controlador?.abort();
  }

  download(): void {
    const r = this.estado.resultado;
    if (!r) return;
    const a = document.createElement('a');
    a.href = r.url;
    a.download = r.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ——— Unión ———

  private async ejecutarUnion(): Promise<MergeOutput> {
    // Un solo job en vuelo — INCLUYE la ventana del diálogo de aviso: una segunda
    // llamada no puede sobrescribir avisoResolver (la primera quedaría colgada).
    if (this.unionEnCurso || this.estado.job?.status === 'running') {
      const err = new MergeError({ code: 'JOB_IN_PROGRESS', message: 'ya hay una unión en curso' });
      this.emitir(EVENTOS.error, { code: err.code, message: err.message, details: err.details });
      throw err;
    }
    this.unionEnCurso = true;
    try {
      return await this.unionInterna();
    } finally {
      this.unionEnCurso = false;
    }
  }

  private async unionInterna(): Promise<MergeOutput> {
    const unibles = seleccionarPistasUnibles(this.estado);
    const errMinimo = comprobarMinimoPistas(unibles.length, this.config.limits);
    if (errMinimo) {
      this.emitir(EVENTOS.error, { code: errMinimo.code, message: errMinimo.message, details: errMinimo.details });
      throw errMinimo;
    }

    // Aviso previo por estimación (D-04/plan §5): conservador (máx entre copia y
    // re-codificación estimadas; la estrategia real la decide la sonda).
    {
      const salida = formatoSalida(this.estado.opciones.format);
      const totales = totalesDeLista(unibles);
      const estimacionCopia = estimarSalida(unibles, 'copy', null);
      const bps = salida?.bytesPorSegundo(this.estado.opciones.bitrateKbps ?? null) ?? null;
      const estimacionRecod = estimarSalida(unibles, 'reencode', bps);
      const bytes = Math.max(estimacionCopia.bytes ?? 0, estimacionRecod.bytes ?? 0) || null;
      const razones = razonesDeAviso({ bytes, duracionMs: totales.duracionMs, parcial: totales.duracionMs === null }, this.config.limits);
      if (razones.length > 0) {
        this.estado = reducer(this.estado, { tipo: 'AVISO_PENDIENTE', razones });
        this.renderizarDialogoAviso(bytes, totales.duracionMs);
        const continuar = await new Promise<boolean>((resolver) => { this.avisoResolver = resolver; });
        this.avisoResolver = null;
        this.cerrarDialogoAviso();
        if (!continuar) {
          const cancelado = new MergeError({ code: 'USER_CANCELLED', message: 'el usuario no continuó tras el aviso' });
          // Estado 'cancelled' visible también al cancelar DESDE el aviso
          // (antes de iniciar el job): la barra muestra «Unión cancelado».
          this.estado = reducer(this.estado, { tipo: 'ERROR', error: cancelado });
          this.emitir(EVENTOS.cancelada, { jobId: null });
          this.renderizarEstado();
          throw cancelado;
        }
      }
    }

    const job: MergeJob = {
      id: crearId(),
      createdAt: Date.now(),
      trackIds: unibles.map((p) => p.id),
      outputFormat: String(this.estado.opciones.format),
      bitrateKbps: this.estado.opciones.bitrateKbps ?? null,
      status: 'running',
      progress: 0,
      stage: 'loading-engine',
      startedAt: Date.now(),
    };
    this.controlador = new AbortController();
    // La URL del resultado anterior se revoca al iniciar un job nuevo (sin fugas
    // si el job anterior quedó descartado por clear/reset a mitad).
    if (this.estado.resultado) this.revocarURL(this.estado.resultado.url);
    this.estado = reducer(this.estado, { tipo: 'JOB_INICIADO', job });
    this.emitir(EVENTOS.unionIniciada, { job });
    this.renderizarHerramientas();
    this.renderizarEstado();

    const entradas: EntradaUnion[] = unibles.map((p) => ({ id: p.id, name: p.name, blob: this.archivos.get(p.id) ?? new Blob() }));
    if (!this.motor) this.motor = new MotorFfmpeg(this.config);

    try {
      const salida = await mergeTracks(entradas, this.estado.opciones, {
        config: this.config,
        motor: this.motor,
        planificador: planificarUnion,
        validadorContenedor: (bytes, formato) => formatoSalida(formato)?.sniff(bytes) ?? false,
        esquemasOpciones: esquemasOpcionesRegistradas(),
        signal: this.controlador.signal,
        onProgress: (p) => {
          this.estado = reducer(this.estado, {
            tipo: 'JOB_PROGRESO',
            job: { ...job, progress: p.progress, stage: p.stage },
          });
          this.emitir(EVENTOS.progresoUnion, { ...p });
          this.renderizarEstado();
        },
      });
      if (this.estado.resultado) this.revocarURL(this.estado.resultado.url);
      const url = URL.createObjectURL(salida.blob);
      const resultado: ResultadoUI = {
        url,
        blob: salida.blob,
        name: salida.name,
        mimeType: salida.mimeType,
        size: salida.size,
        durationMs: salida.durationMs,
        strategy: salida.strategy,
        warnings: salida.warnings.map((w) => ({ code: w.code as string, message: w.message, params: w.params })),
      };
      this.estado = reducer(this.estado, { tipo: 'JOB_COMPLETADO', jobId: job.id, resultado });
      // Red de seguridad: si el job fue descartado (clear/reset a mitad), el
      // reducer ignora la finalización y la URL recién creada se revoca aquí.
      if (this.estado.resultado?.url !== url) this.revocarURL(url);
      this.emitir(EVENTOS.unionCompletada, {
        blob: salida.blob, url, name: salida.name, mimeType: salida.mimeType,
        size: salida.size, durationMs: salida.durationMs, strategy: salida.strategy,
        warnings: salida.warnings.map((w) => ({ code: w.code as string, message: w.message, params: w.params })),
      });
      this.renderizarHerramientas();
      this.renderizarEstado();
      this.renderizarResultado();
      return salida;
    } catch (e) {
      const err = toMergeError(e);
      if (err.code === 'USER_CANCELLED') {
        this.estado = reducer(this.estado, { tipo: 'JOB_CANCELADO' });
        this.emitir(EVENTOS.cancelada, { jobId: job.id });
      } else {
        // Fallos de sonda POR PISTA: las pistas implicadas quedan marcadas como
        // inválidas (fila visible con chip) y se excluyen de la siguiente unión.
        this.marcarPistasInvalidas(err);
        this.estado = reducer(this.estado, { tipo: 'JOB_ERROR', jobId: job.id, error: err });
        this.emitir(EVENTOS.error, { code: err.code, message: err.message, details: err.details });
        this.renderizarLista();
      }
      this.renderizarHerramientas();
      this.renderizarEstado();
      this.renderizarError();
      throw err;
    } finally {
      this.controlador = null;
    }
  }

  /** Marca como inválidas las pistas citadas por un fallo de sonda clasificado. */
  private marcarPistasInvalidas(err: MergeError): void {
    if (err.code !== 'CORRUPT_FILE' && err.code !== 'UNSUPPORTED_FORMAT' && err.code !== 'PROBE_FAILED') return;
    const ids = Array.isArray(err.details.ids) ? (err.details.ids as string[]) : [];
    for (const id of ids) {
      if (!this.estado.porId.has(id)) continue;
      this.estado = reducer(this.estado, {
        tipo: 'ACTUALIZAR_PISTA',
        id,
        cambios: { status: 'invalid', errorCode: err.code },
      });
    }
  }

  private async completarDuracion(id: string): Promise<void> {
    const archivo = this.archivos.get(id);
    // La duración es OPCIONAL: cualquier fallo (o entorno sin object URLs) deja la
    // pista lista con duración desconocida — nunca atascada en 'analyzing'.
    let duracion: number | null = null;
    if (archivo) {
      try {
        duracion = await leerDuracion(archivo);
      } catch {
        duracion = null;
      }
    }
    if (!this.estado.porId.has(id)) return; // se quitó mientras se leía
    this.estado = reducer(this.estado, {
      tipo: 'ACTUALIZAR_PISTA',
      id,
      cambios: { durationMs: duracion, status: 'ready' },
    });
    this.renderizarHerramientas();
    this.renderizarLista();
    this.renderizarEstado();
  }

  // ——— Render ———

  private renderizarCompleto(): void {
    if (!this.sombra || this.estructural.headless === true) {
      if (this.sombra) this.sombra.innerHTML = '';
      return;
    }
    if (!this.sombra.querySelector('.am-root')) {
      this.sombra.innerHTML = `
        <div class="am-root" data-theme="${this.temaActual()}" part="root">
          <header class="am-cabecera">
            <div class="am-titulo">${ICONOS.onda}<span data-ref="titulo"></span></div>
            <div class="am-subtitulo" data-ref="subtitulo"></div>
          </header>
          <section class="am-zona" data-ref="zona" role="button" tabindex="0">
            ${ICONOS.onda}
            <div class="am-zona__titulo"><span data-ref="zona-titulo"></span> <button type="button" data-ref="zona-boton"></button></div>
            <div class="am-zona__pistas" data-ref="zona-pistas"></div>
            <input type="file" multiple data-ref="entrada" hidden>
          </section>
          <section class="am-herramientas" data-ref="herramientas"></section>
          <div data-ref="notas"></div>
          <ul class="am-lista" data-ref="lista" role="list" aria-label="">
            <li data-ref="espaciador" aria-hidden="true" style="height:0px"></li>
          </ul>
          <section class="am-estado" data-ref="estado">
            <div class="am-estado__texto" data-ref="estado-texto" role="status" aria-live="polite"></div>
            <div class="am-progreso" data-ref="progreso" hidden><div class="am-progreso__barra" data-ref="progreso-barra"></div></div>
          </section>
          <section data-ref="resultado"></section>
          <section data-ref="error"></section>
          <div data-ref="dialogo"></div>
          <div class="am-solo-lectores" data-ref="anuncios" role="status" aria-live="polite"></div>
        </div>`;
      this.conectarEventos();
    }
    this.renderizarTextos();
    this.renderizarHerramientas();
    this.renderizarLista();
    this.renderizarEstado();
    this.renderizarResultado();
    this.renderizarError();
  }

  private temaActual(): string {
    const tema = this.estructural.theme;
    return typeof tema === 'string' ? tema : 'auto';
  }

  private ref<Q extends HTMLElement>(nombre: string): Q {
    const el = this.sombra?.querySelector(`[data-ref="${nombre}"]`) as Q | null;
    if (!el) throw new MergeError({ code: 'UNKNOWN_ENGINE_ERROR', message: `referencia interna ausente: ${nombre}` });
    return el;
  }

  private renderizarTextos(): void {
    if (!this.sombra) return;
    this.ref<HTMLElement>('titulo').textContent = t('app.titulo');
    this.ref<HTMLElement>('subtitulo').textContent = t('app.subtitulo');
    this.ref<HTMLElement>('zona-titulo').textContent = t('dropzone.titulo');
    this.ref<HTMLButtonElement>('zona-boton').textContent = t('dropzone.examinar');
    this.ref<HTMLUListElement>('lista').setAttribute('aria-label', t('lista.label'));
    const zona = this.ref<HTMLElement>('zona');
    zona.setAttribute('aria-label', t('dropzone.label'));
    const formatos = formatosEntradaRegistrados().map((f) => t(f.etiquetaKey)).join(', ');
    this.ref<HTMLElement>('zona-pistas').textContent = `${t('dropzone.formatos', { formatos })} · ${t('dropzone.max', { n: this.config.limits.maxTracks })}`;
    this.ref<HTMLInputElement>('entrada').accept = formatosEntradaRegistrados().flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');
    const raiz = this.sombra.querySelector('.am-root');
    if (raiz) raiz.setAttribute('data-theme', this.temaActual());
  }

  private conectarEventos(): void {
    const zona = this.ref<HTMLElement>('zona');
    const entrada = this.ref<HTMLInputElement>('entrada');
    zona.addEventListener('click', () => entrada.click());
    zona.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        entrada.click();
      }
    });
    entrada.addEventListener('change', () => {
      void this.addFiles(entrada.files ?? []);
      entrada.value = '';
    });
    zona.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      zona.dataset.activa = 'true';
    });
    zona.addEventListener('dragleave', () => { zona.dataset.activa = 'false'; });
    zona.addEventListener('drop', (ev) => {
      ev.preventDefault();
      zona.dataset.activa = 'false';
      if (ev.dataTransfer?.files?.length) void this.addFiles(ev.dataTransfer.files);
    });
  }

  private renderizarHerramientas(): void {
    if (!this.sombra || this.estructural.headless === true) return;
    const cont = this.ref<HTMLElement>('herramientas');
    const pistas = this.estado.orden.map((id) => this.estado.porId.get(id)!);
    const totales = totalesDeLista(pistas);
    const enCurso = this.estado.job?.status === 'running';
    const unibles = seleccionarPistasUnibles(this.estado).length;
    const puedeUnir = !enCurso && unibles >= this.config.limits.minTracks;

    cont.innerHTML = '';
    if (pistas.length === 0 && !enCurso) return;

    const tot = document.createElement('div');
    tot.className = 'am-totales';
    const etiquetaN = pistas.length === 1 ? t('toolbar.pista1', { n: 1 }) : t('toolbar.pistas', { n: pistas.length });
    tot.innerHTML = `<b></b><span></span>`;
    const [b, s] = [tot.querySelector('b')!, tot.querySelector('span')!];
    b.textContent = etiquetaN;
    s.textContent = `${totales.duracionMs === null ? t('toolbar.duracionDesconocida') : `${t('toolbar.duracion', { duracion: formatearDuracion(totales.duracionMs) })}`} · ${t('toolbar.tamano', { tamano: formatearBytes(totales.bytes) })}`;
    cont.appendChild(tot);

    if (!enCurso && !this.estado.resultado) {
      const salidas = formatosSalidaRegistrados();
      const campoFormato = this.campoSelect('toolbar.formato', salidas.map((f) => ({ valor: f.id, etiqueta: t(f.etiquetaKey) })), String(this.estado.opciones.format), (valor) => {
        this.setOptions({ format: valor } as Partial<MergeOptions>);
        const salida = formatoSalida(valor);
        if (salida?.bitratesKbps && (this.estado.opciones.bitrateKbps === null || !salida.bitratesKbps.includes(this.estado.opciones.bitrateKbps))) {
          this.setOptions({ bitrateKbps: salida.bitratePorDefecto } as Partial<MergeOptions>);
        }
        if (!salida?.bitratesKbps) {
          this.setOptions({ bitrateKbps: null } as Partial<MergeOptions>);
        }
        this.renderizarHerramientas();
      });
      cont.appendChild(campoFormato);

      const salidaActual = formatoSalida(String(this.estado.opciones.format));
      if (salidaActual?.bitratesKbps) {
        const campoBitrate = this.campoSelect('opcion.bitrate', salidaActual.bitratesKbps.map((b) => ({ valor: String(b), etiqueta: `${b} kbps` })), String(this.estado.opciones.bitrateKbps ?? salidaActual.bitratePorDefecto), (valor) => {
          this.setOptions({ bitrateKbps: Number(valor) } as Partial<MergeOptions>);
        });
        cont.appendChild(campoBitrate);
      }

      const btnUnir = document.createElement('button');
      btnUnir.type = 'button';
      btnUnir.className = 'am-btn am-btn--primario';
      btnUnir.innerHTML = `${ICONOS.ok}<span></span>`;
      btnUnir.querySelector('span')!.textContent = t('toolbar.unir');
      btnUnir.disabled = !puedeUnir;
      if (!puedeUnir) btnUnir.title = t('toolbar.unirAyuda', { n: this.config.limits.minTracks });
      btnUnir.addEventListener('click', () => { void this.ejecutarUnion(); });
      cont.appendChild(btnUnir);
    }

    if (enCurso) {
      const btnCancelar = document.createElement('button');
      btnCancelar.type = 'button';
      btnCancelar.className = 'am-btn am-btn--peligro';
      btnCancelar.textContent = t('toolbar.cancelar');
      btnCancelar.addEventListener('click', () => this.cancel());
      cont.appendChild(btnCancelar);
    } else if (pistas.length > 0) {
      const btnVaciar = document.createElement('button');
      btnVaciar.type = 'button';
      btnVaciar.className = 'am-btn am-btn--fantasma';
      btnVaciar.textContent = t('toolbar.vaciar');
      btnVaciar.addEventListener('click', () => this.clear());
      cont.appendChild(btnVaciar);
    }
  }

  private campoSelect(etiquetaKey: string, opciones: readonly { valor: string; etiqueta: string }[], seleccionado: string, alCambiar: (valor: string) => void): HTMLElement {
    const campo = document.createElement('label');
    campo.className = 'am-campo';
    const etiqueta = document.createElement('span');
    etiqueta.textContent = t(etiquetaKey);
    const select = document.createElement('select');
    for (const o of opciones) {
      const option = document.createElement('option');
      option.value = o.valor;
      option.textContent = o.etiqueta;
      option.selected = o.valor === seleccionado;
      select.appendChild(option);
    }
    select.addEventListener('change', () => alCambiar(select.value));
    campo.append(etiqueta, select);
    return campo;
  }

  // ——— Lista con claves estables y virtualización condicional ———

  private virtualActiva(): boolean {
    return this.estado.orden.length > this.config.virtualization.threshold;
  }

  private renderizarLista(): void {
    if (!this.sombra || this.estructural.headless === true) return;
    const lista = this.ref<HTMLUListElement>('lista');
    const notas = this.ref<HTMLElement>('notas');
    const orden = this.estado.orden;
    const espaciador = this.sombra.querySelector<HTMLElement>('[data-ref="espaciador"]');

    // Filas huérfanas fuera del orden:
    for (const [id, fila] of this.filas) {
      if (!orden.includes(id)) {
        fila.remove();
        this.filas.delete(id);
      }
    }

    if (orden.length === 0) {
      for (const [, fila] of this.filas) fila.remove();
      this.filas.clear();
      const vaciaExistente = lista.querySelector('.am-vacia');
      if (!vaciaExistente) {
        const vacia = document.createElement('li');
        vacia.className = 'am-vacia';
        vacia.textContent = t('lista.vacia');
        lista.appendChild(vacia);
      }
      notas.innerHTML = '';
      lista.style.maxHeight = '';
      lista.style.overflowY = '';
      lista.style.position = '';
      // Regresión N1: el espaciador también se resetea (si no, queda un hueco de
      // miles de px tras vaciar una lista virtualizada).
      if (espaciador) espaciador.style.height = '0px';
      if (espaciador) espaciador.style.display = 'none';
      lista.onscroll = null;
      return;
    }
    lista.querySelector('.am-vacia')?.remove();

    const virtual = this.virtualActiva();
    notas.innerHTML = '';
    if (virtual) {
      const nota = document.createElement('div');
      nota.className = 'am-nota-virtual';
      nota.textContent = t('lista.virtual');
      notas.appendChild(nota);
    }

    const visibles = this.ventanaVisible();
    const anclar = (fila: HTMLLIElement, indice: number): void => {
      if (virtual) {
        fila.style.position = 'absolute';
        fila.style.top = `${indice * this.config.virtualization.rowHeightPx}px`;
        fila.style.left = '0';
        fila.style.right = '0';
        fila.style.height = `${this.config.virtualization.rowHeightPx}px`;
      } else {
        fila.style.cssText = '';
      }
      lista.appendChild(fila);
    };

    // Modo virtual REAL: el contenedor scrollea por dentro (max-height + overflow)
    // y un espaciador da la altura total; solo se montan las filas de la ventana.
    // flex:none evita que la columna flex encoja el espaciador (regresión B2) y
    // display:none fuera del modo virtual evita el hueco del gap (residual 7).
    if (virtual) {
      lista.style.maxHeight = `${this.config.virtualization.maxHeightPx}px`;
      lista.style.overflowY = 'auto';
      lista.style.position = 'relative';
      if (espaciador) {
        espaciador.style.display = '';
        espaciador.style.flex = 'none';
        espaciador.style.height = `${orden.length * this.config.virtualization.rowHeightPx}px`;
        lista.insertBefore(espaciador, lista.firstChild);
      }
      lista.onscroll = () => this.renderizarLista();
    } else {
      lista.style.maxHeight = '';
      lista.style.overflowY = '';
      lista.style.position = '';
      if (espaciador) {
        espaciador.style.height = '0px';
        espaciador.style.display = 'none';
      }
      lista.onscroll = null;
    }

    for (let i = visibles.inicio; i < visibles.fin; i++) {
      const id = orden[i]!;
      const pista = this.estado.porId.get(id)!;
      let fila = this.filas.get(id);
      if (!fila) {
        fila = this.crearFila();
        this.filas.set(id, fila);
      }
      this.actualizarFila(fila, pista, i, virtual);
      anclar(fila, i);
    }
    // Filas fuera de la ventana se desmontan (siguen en el mapa para reutilizar):
    for (const [id, fila] of this.filas) {
      const indice = orden.indexOf(id);
      if (virtual && (indice < visibles.inicio || indice >= visibles.fin)) fila.remove();
    }
  }

  private ventanaVisible(): { inicio: number; fin: number } {
    if (!this.virtualActiva()) return { inicio: 0, fin: this.estado.orden.length };
    const lista = this.ref<HTMLUListElement>('lista');
    const v = calcularVentana({
      total: this.estado.orden.length,
      alturaFila: this.config.virtualization.rowHeightPx,
      overscan: this.config.virtualization.overscan,
      scrollTop: lista.scrollTop,
      // clientHeight puede ser 0 antes del layout: cae al máximo configurado.
      alturaContenedor: lista.clientHeight || this.config.virtualization.maxHeightPx,
    });
    return { inicio: v.inicio, fin: v.fin };
  }

  private crearFila(): HTMLLIElement {
    const fila = document.createElement('li');
    fila.className = 'am-fila';
    fila.setAttribute('role', 'listitem');
    fila.innerHTML = `
      <span class="am-fila__mango" data-ref-fila="mango">${ICONOS.mango}</span>
      <span class="am-fila__num" data-ref-fila="num"></span>
      <div class="am-fila__cuerpo">
        <span class="am-fila__nombre" data-ref-fila="nombre"></span>
        <span class="am-fila__meta" data-ref-fila="meta"></span>
      </div>
      <span data-ref-fila="chip"></span>
      <div class="am-fila__acciones">
        <button type="button" class="am-btn-icono" data-ref-fila="subir" data-accion="subir"></button>
        <button type="button" class="am-btn-icono" data-ref-fila="bajar" data-accion="bajar"></button>
        <button type="button" class="am-btn-icono" data-tipo="peligro" data-ref-fila="quitar" data-accion="quitar"></button>
      </div>`;

    const subir = fila.querySelector<HTMLButtonElement>('[data-ref-fila="subir"]')!;
    const bajar = fila.querySelector<HTMLButtonElement>('[data-ref-fila="bajar"]')!;
    const quitar = fila.querySelector<HTMLButtonElement>('[data-ref-fila="quitar"]')!;
    subir.innerHTML = ICONOS.subir;
    bajar.innerHTML = ICONOS.subir;
    bajar.querySelector('svg')!.style.transform = 'rotate(180deg)';
    quitar.innerHTML = ICONOS.quitar;

    subir.addEventListener('click', () => this.accionFila(fila, 'subir'));
    bajar.addEventListener('click', () => this.accionFila(fila, 'bajar'));
    quitar.addEventListener('click', () => this.accionFila(fila, 'quitar'));

    fila.addEventListener('dragstart', (ev) => {
      this.idArrastrandose = fila.dataset.id ?? null;
      fila.dataset.origen = 'true';
      ev.dataTransfer?.setData('text/plain', fila.dataset.id ?? '');
      ev.dataTransfer!.effectAllowed = 'move';
    });
    fila.addEventListener('dragend', () => {
      fila.dataset.origen = 'false';
      this.idArrastrandose = null;
      this.renderizarLista();
    });
    fila.addEventListener('dragover', (ev) => {
      if (this.idArrastrandose === null) return;
      ev.preventDefault();
      fila.dataset.sobre = 'true';
    });
    fila.addEventListener('dragleave', () => { fila.dataset.sobre = 'false'; });
    fila.addEventListener('drop', (ev) => {
      ev.preventDefault();
      fila.dataset.sobre = 'false';
      // Archivos del SISTEMA sobre una fila: mismo tratamiento que la zona de carga.
      if (ev.dataTransfer?.files?.length) {
        void this.addFiles(ev.dataTransfer.files);
        return;
      }
      const id = this.idArrastrandose ?? ev.dataTransfer?.getData('text/plain');
      if (!id || id === fila.dataset.id) return;
      const de = this.estado.orden.indexOf(id);
      const a = this.estado.orden.indexOf(fila.dataset.id ?? '');
      if (de < 0 || a < 0) return;
      this.estado = reducer(this.estado, { tipo: 'MOVER', de, a });
      const pista = this.estado.porId.get(id);
      this.anunciar(t('a11y.movida', { nombre: pista?.name ?? '', pos: a + 1 }));
      this.emitir(EVENTOS.reordenado, { orden: [...this.estado.orden], de, a, origen: 'arrastrar' });
      this.renderizarLista();
    });
    return fila;
  }

  private accionFila(fila: HTMLLIElement, accion: 'subir' | 'bajar' | 'quitar'): void {
    const id = fila.dataset.id ?? '';
    if (!id) return;
    if (accion === 'quitar') {
      this.removeTrack(id);
      return;
    }
    const delta = accion === 'subir' ? -1 : 1;
    const indice = this.estado.orden.indexOf(id);
    try {
      this.estado = reducer(this.estado, { tipo: 'MOVER_ID', id, delta });
    } catch {
      return; // límite del movimiento: nada que hacer (botón deshabilitado en UI)
    }
    const pista = this.estado.porId.get(id);
    if (pista) this.anunciar(t('a11y.movida', { nombre: pista.name || t('pista.nombreVacio'), pos: this.estado.orden.indexOf(id) + 1 }));
    this.emitir(EVENTOS.reordenado, { orden: [...this.estado.orden], de: indice, a: this.estado.orden.indexOf(id), origen: 'boton' });
    this.renderizarLista();
    // Foco: mantener el foco en el mismo botón de la fila movida.
    const boton = fila.querySelector<HTMLButtonElement>(`[data-ref-fila="${accion}"]`);
    boton?.focus();
  }

  private actualizarFila(fila: HTMLLIElement, pista: AudioTrack, indice: number, virtual: boolean): void {
    fila.dataset.id = pista.id;
    fila.dataset.estado = pista.status;
    fila.setAttribute('aria-roledescription', t('pista.numero', { n: indice + 1 }));
    fila.setAttribute('aria-label', `${t('pista.numero', { n: indice + 1 })}: ${pista.name || t('pista.nombreVacio')}`);
    fila.draggable = !virtual;

    const num = fila.querySelector<HTMLElement>('[data-ref-fila="num"]')!;
    num.textContent = String(indice + 1);
    const nombre = fila.querySelector<HTMLElement>('[data-ref-fila="nombre"]')!;
    nombre.textContent = pista.name || t('pista.nombreVacio');
    const meta = fila.querySelector<HTMLElement>('[data-ref-fila="meta"]')!;
    meta.textContent = [
      pista.durationMs === null ? (pista.status === 'analyzing' ? t('pista.analizando') : t('pista.duracionDesconocida')) : formatearDuracion(pista.durationMs),
      formatearBytes(pista.size),
      pista.extension.toUpperCase(),
    ].join(' · ');

    const chip = fila.querySelector<HTMLElement>('[data-ref-fila="chip"]')!;
    if (pista.status === 'invalid') {
      chip.className = 'am-chip';
      chip.dataset.tipo = 'invalid';
      chip.textContent = t('pista.noUnible');
      chip.title = pista.errorCode ?? '';
    } else {
      chip.className = '';
      chip.removeAttribute('data-tipo');
      chip.textContent = '';
      chip.removeAttribute('title');
    }

    const subir = fila.querySelector<HTMLButtonElement>('[data-ref-fila="subir"]')!;
    const bajar = fila.querySelector<HTMLButtonElement>('[data-ref-fila="bajar"]')!;
    const quitar = fila.querySelector<HTMLButtonElement>('[data-ref-fila="quitar"]')!;
    const nombreVisible = pista.name || t('pista.nombreVacio');
    subir.setAttribute('aria-label', t('pista.subir', { nombre: nombreVisible }));
    bajar.setAttribute('aria-label', t('pista.bajar', { nombre: nombreVisible }));
    quitar.setAttribute('aria-label', t('pista.quitar', { nombre: nombreVisible }));
    subir.disabled = indice === 0;
    bajar.disabled = indice === this.estado.orden.length - 1;
    const mango = fila.querySelector<HTMLElement>('[data-ref-fila="mango"]')!;
    mango.setAttribute('aria-hidden', virtual ? 'true' : 'false');
    if (!virtual) mango.title = t('pista.mango', { nombre: nombreVisible });
    else mango.removeAttribute('title');
  }

  // ——— Estado / resultado / error / diálogo / anuncios ———

  private renderizarEstado(): void {
    if (!this.sombra || this.estructural.headless === true) return;
    const texto = this.ref<HTMLElement>('estado-texto');
    const progreso = this.ref<HTMLElement>('progreso');
    const barra = this.ref<HTMLElement>('progreso-barra');
    const job = this.estado.job;
    const enCurso = job?.status === 'running';

    texto.dataset.tono = this.estado.error && this.estado.error.code !== 'USER_CANCELLED' ? 'error' : this.estado.resultado ? 'ok' : 'normal';
    if (enCurso && job) {
      const frases: Record<string, string> = {
        'loading-engine': t('estado.motor', { pct: formatearPorcentaje(job.progress) }),
        probing: t('estado.sonda', { conocidos: job.trackIds.length }),
        merging: t('estado.uniendo', { pct: formatearPorcentaje(job.progress) }),
        validating: t('estado.validando'),
      };
      texto.textContent = frases[job.stage] ?? t('estado.uniendo', { pct: formatearPorcentaje(job.progress) });
      progreso.hidden = false;
      barra.style.width = `${Math.round(job.progress * 100)}%`;
      barra.setAttribute('aria-valuenow', String(Math.round(job.progress * 100)));
    } else if (this.estado.resultado) {
      texto.textContent = t('estado.completado');
      progreso.hidden = true;
    } else if (this.estado.error) {
      texto.textContent = this.estado.error.code === 'USER_CANCELLED' ? t('estado.cancelado') : t('estado.error');
      progreso.hidden = true;
    } else {
      texto.textContent = '';
      progreso.hidden = true;
    }
    progreso.setAttribute('role', 'progressbar');
    progreso.setAttribute('aria-label', t('estado.progresoLabel'));
    progreso.setAttribute('aria-valuemin', '0');
    progreso.setAttribute('aria-valuemax', '100');
  }

  private renderizarResultado(): void {
    if (!this.sombra || this.estructural.headless === true) return;
    const cont = this.ref<HTMLElement>('resultado');
    const r = this.estado.resultado;
    cont.innerHTML = '';
    if (!r) return;

    const panel = document.createElement('div');
    panel.className = 'am-resultado';
    const titulo = document.createElement('div');
    titulo.className = 'am-resultado__titulo';
    titulo.innerHTML = `${ICONOS.ok}<span></span>`;
    titulo.querySelector('span')!.textContent = t('resultado.titulo');
    const meta = document.createElement('div');
    meta.className = 'am-resultado__meta';
    meta.textContent = [
      `${t('resultado.duracion')}: ${r.durationMs === null ? t('resultado.duracionDesconocida') : formatearDuracion(r.durationMs)}`,
      `${t('resultado.tamano')}: ${formatearBytes(r.size)}`,
      `${t('resultado.formato')}: ${etiquetaMime(r.mimeType)}`,
      r.strategy === 'copy' ? t('resultado.estrategiaCopia') : t('resultado.estrategiaRecodificacion'),
    ].join(' · ');

    const acciones = document.createElement('div');
    acciones.className = 'am-resultado__acciones';
    const btnDescargar = document.createElement('button');
    btnDescargar.type = 'button';
    btnDescargar.className = 'am-btn am-btn--primario';
    btnDescargar.innerHTML = `${ICONOS.descargar}<span></span>`;
    btnDescargar.querySelector('span')!.textContent = `${t('resultado.descargar')} · ${r.name}`;
    btnDescargar.addEventListener('click', () => this.download());
    const btnOtra = document.createElement('button');
    btnOtra.type = 'button';
    btnOtra.className = 'am-btn am-btn--fantasma';
    btnOtra.textContent = t('resultado.otra');
    btnOtra.addEventListener('click', () => this.reset());
    acciones.append(btnDescargar, btnOtra);

    panel.append(titulo, meta);
    if (r.warnings.length > 0) {
      const avisos = document.createElement('div');
      avisos.className = 'am-avisos';
      for (const w of r.warnings) {
        const div = document.createElement('div');
        // Plantilla i18n con los parámetros del aviso (si los trae); si falta la
        // plantilla, el mensaje técnico del aviso (siempre visible, nunca tokens).
        const params = 'params' in w ? (w as { params?: Record<string, string | number> }).params : undefined;
        const plantilla = t(`avisoCodigo.${w.code}`, params);
        div.textContent = `⚠ ${plantilla.startsWith('⟨falta texto') ? w.message : plantilla}`;
        avisos.appendChild(div);
      }
      panel.appendChild(avisos);
    }
    const preescucha = document.createElement('audio');
    preescucha.controls = true;
    preescucha.src = r.url;
    preescucha.setAttribute('aria-label', t('resultado.preescucha'));
    panel.append(acciones, preescucha);
    cont.appendChild(panel);
  }

  private renderizarError(): void {
    if (!this.sombra || this.estructural.headless === true) return;
    const cont = this.ref<HTMLElement>('error');
    cont.innerHTML = '';
    const err = this.estado.error;
    if (!err || err.code === 'USER_CANCELLED') return;

    const panel = document.createElement('div');
    panel.className = 'am-error';
    const titulo = document.createElement('div');
    titulo.className = 'am-error__titulo';
    titulo.textContent = this.mensajeDeError(err, true); // mensaje para el usuario
    const detalle = document.createElement('div');
    detalle.className = 'am-error__detalle';
    detalle.textContent = err.message; // detalle técnico (números y rutas exactas)
    const consejo = document.createElement('div');
    consejo.className = 'am-error__consejo';
    consejo.textContent = this.consejoDeError(err);
    const codigo = document.createElement('div');
    codigo.className = 'am-error__codigo';
    codigo.textContent = `code: ${err.code}`;
    panel.append(titulo, detalle, consejo, codigo);

    if (RETRYABLE_CODES.includes(err.code)) {
      const btnReintentar = document.createElement('button');
      btnReintentar.type = 'button';
      btnReintentar.className = 'am-btn am-btn--fantasma';
      btnReintentar.textContent = t('misc.reintentar');
      btnReintentar.addEventListener('click', () => {
        this.estado = reducer(this.estado, { tipo: 'REINICIAR' });
        this.renderizarError();
        void this.ejecutarUnion();
      });
      panel.appendChild(btnReintentar);
    }
    cont.appendChild(panel);
  }

  private renderizarDialogoAviso(bytes: number | null, duracionMs: number | null): void {
    if (!this.sombra) return;
    const cont = this.ref<HTMLElement>('dialogo');
    cont.innerHTML = '';
    const fondo = document.createElement('div');
    fondo.className = 'am-dialogo-fondo';
    const dialogo = document.createElement('div');
    dialogo.className = 'am-dialogo';
    dialogo.setAttribute('role', 'alertdialog');
    dialogo.setAttribute('aria-modal', 'true');
    const titulo = document.createElement('div');
    titulo.className = 'am-dialogo__titulo';
    titulo.innerHTML = `${ICONOS.aviso}<span></span>`;
    titulo.querySelector('span')!.textContent = t('aviso.titulo');
    const cuerpo = document.createElement('div');
    cuerpo.className = 'am-dialogo__cuerpo';
    cuerpo.textContent = t('aviso.cuerpo', {
      tamano: bytes === null ? '—' : formatearBytes(bytes),
      duracion: duracionMs === null ? t('aviso.duracionDesconocida') : formatearDuracion(duracionMs),
    });
    const acciones = document.createElement('div');
    acciones.className = 'am-dialogo__acciones';
    const btnContinuar = document.createElement('button');
    btnContinuar.type = 'button';
    btnContinuar.className = 'am-btn am-btn--primario';
    btnContinuar.textContent = t('aviso.continuar');
    btnContinuar.addEventListener('click', () => this.avisoResolver?.(true));
    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'am-btn am-btn--fantasma';
    btnCancelar.textContent = t('aviso.cancelar');
    btnCancelar.addEventListener('click', () => this.avisoResolver?.(false));
    acciones.append(btnCancelar, btnContinuar);
    dialogo.append(titulo, cuerpo, acciones);
    dialogo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        this.avisoResolver?.(false);
        return;
      }
      // Trampa de foco mínima: Tab cicla entre los botones del diálogo.
      if (ev.key === 'Tab') {
        ev.preventDefault();
        const focos = Array.from(dialogo.querySelectorAll<HTMLButtonElement>('button'));
        const actual = focos.indexOf(document.activeElement as HTMLButtonElement);
        const siguiente = ev.shiftKey ? (actual <= 0 ? focos.length - 1 : actual - 1) : (actual === focos.length - 1 ? 0 : actual + 1);
        focos[siguiente]?.focus();
      }
    });
    fondo.appendChild(dialogo);
    cont.appendChild(fondo);
    btnContinuar.focus();
  }

  private cerrarDialogoAviso(): void {
    const cont = this.sombra?.querySelector('[data-ref="dialogo"]');
    if (cont) cont.innerHTML = '';
    this.estado = reducer(this.estado, { tipo: 'LIMPIAR_AVISO' });
  }

  private anunciar(texto: string): void {
    if (!this.sombra) return;
    this.ref<HTMLElement>('anuncios').textContent = texto;
  }

  private devolverFoco(indiceEliminada: number): void {
    // Foco a la fila que OCUPA el índice de la eliminada (o la última existente):
    // índice posicional, jamás comparaciones de UUID (léxico sin sentido).
    const destino = Math.min(indiceEliminada, this.estado.orden.length - 1);
    const siguienteId = destino >= 0 ? this.estado.orden[destino] : undefined;
    if (!siguienteId) {
      this.ref<HTMLElement>('zona').focus();
      return;
    }
    const fila = this.filas.get(siguienteId);
    fila?.querySelector<HTMLButtonElement>('[data-ref-fila="quitar"]')?.focus();
  }

  /** Parámetros de interpolación COMPLETOS a partir de err.details (sin fugas de {tokens}). */
  private parametrosDeError(err: MergeError): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    const d = (err.details ?? {}) as Record<string, unknown>;
    if (typeof d.nombre === 'string') params.nombre = d.nombre;
    // Multi-pista (CORRUPT_FILE/PROBE_FAILED agregados): {nombre} toma la primera.
    if (params.nombre === undefined && Array.isArray(d.nombres)) params.nombre = (d.nombres as string[])[0] ?? '';
    if (typeof d.formato === 'string') params.formato = d.formato;
    if (typeof d.extension === 'string' && params.formato === undefined) params.formato = d.extension;
    else if (typeof d.mimeType === 'string' && params.formato === undefined && d.extension === undefined) params.formato = d.mimeType;
    // Camino de sonda (agregado {ids, nombres, causas} sin extension/mimeType):
    // el formato se deduce de la extensión del nombre real.
    if (params.formato === undefined) {
      const nombreBase = typeof d.nombre === 'string' ? d.nombre : Array.isArray(d.nombres) ? String((d.nombres as string[])[0] ?? '') : '';
      const ext = nombreBase.includes('.') ? nombreBase.slice(nombreBase.lastIndexOf('.') + 1) : '';
      if (ext !== '') params.formato = ext;
    }
    if (typeof d.limite === 'number') params.limite = formatearBytes(d.limite);
    if (typeof d.maximo === 'number' && params.limite === undefined) params.limite = formatearBytes(d.maximo);
    if (typeof d.n === 'number') params.n = d.n;
    if (typeof d.minimo === 'number' && params.n === undefined) params.n = d.minimo;
    if (typeof d.maximo === 'number' && params.n === undefined) params.n = d.maximo;
    if (typeof d.obtenidas === 'number' && params.n === undefined) params.n = d.obtenidas;
    if (typeof d.duracion === 'string') params.duracion = d.duracion;
    if (typeof d.total === 'number' && params.duracion === undefined) params.duracion = formatearDuracion(d.total);
    if (typeof d.detalle === 'string') params.detalle = d.detalle;
    // CONFIG_INVALID de atributos: {atributo, recibido} → detalle accionable.
    if (typeof d.atributo === 'string') {
      params.detalle = `atributo «${d.atributo}» con valor «${String(d.recibido ?? '')}»`;
    }
    if (Array.isArray(d.problemas)) params.detalle = (d.problemas as string[]).join('; ');
    if (Array.isArray(d.desconocidas)) params.detalle = (d.desconocidas as string[]).join(', ');
    if (Array.isArray(d.issues)) params.detalle = (d.issues as { key: string }[]).map((i) => i.key).join(', ');
    if (Array.isArray(d.nombres)) params.nombres = (d.nombres as string[]).join(', ');
    // PROBE_FAILED general/invariante: nombres ausentes → los declara como cota.
    if (params.nombres === undefined && params.detalle === undefined && (typeof d.n === 'number' || typeof d.esperados === 'number')) {
      params.nombres = `las ${String(d.n ?? d.esperados ?? '?')} pistas`;
    }
    if (Array.isArray(d.formatos)) params.formatos = (d.formatos as string[]).join(', ');
    if (params.formatos === undefined) params.formatos = formatosEntradaRegistrados().map((f) => t(f.etiquetaKey)).join(', ');
    return params;
  }

  private mensajeDeError(err: MergeError, titulo: boolean): string {
    const clave = `error.${err.code}.mensaje`;
    const plantilla = t(clave);
    if (plantilla.startsWith('⟨falta texto')) return titulo ? t('estado.error') : err.message;
    return t(clave, this.parametrosDeError(err));
  }

  private consejoDeError(err: MergeError): string {
    const plantilla = t(`error.${err.code}.consejo`);
    if (plantilla.startsWith('⟨falta texto')) return '';
    return t(`error.${err.code}.consejo`, this.parametrosDeError(err));
  }

/** Revoca una object URL si el entorno lo soporta (jsdom/SSR no la tienen). */
  private revocarURL(url: string | undefined): void {
    if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  }

  private emitir(nombre: string, detalle: unknown): void {
    this.dispatchEvent(new CustomEvent(nombre, { detail: detalle, bubbles: true, composed: true }));
  }
}

/** Registra el elemento si el entorno lo permite (guarda para Node/tests/SSR). */
export function registrarElemento(): void {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(NOMBRE_ELEMENTO)) customElements.define(NOMBRE_ELEMENTO, AudioMergerElement);
}
