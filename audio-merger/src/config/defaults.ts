/**
 * Configuración centralizada (FASE 2). TODO límite, umbral, formato, bitrate y
 * mensaje vive aquí o en el registro (config/registry.ts); en el resto del código
 * solo se permiten constantes técnicas justificadas en comentarios.
 *
 * Las URLs de la CDN son constantes técnicas ancladas por versión exacta
 * (reproducibilidad del motor); se pueden sobrescribir con `engine-base` o con
 * la configuración completa sin tocar código.
 */
import type { ErrorCode } from '../core/errors';

export type EngineMode = 'auto' | 'single' | 'multi';

/** URLs ancladas del core ffmpeg.wasm (ST y MT). */
export interface EngineCdnUrls {
  readonly coreJs: string;
  readonly coreWasm: string;
  readonly coreWorkerJs: string;
  readonly coreMtJs: string;
  readonly coreMtWasm: string;
}

export interface LimitsConfig {
  /** Mínimo de pistas VÁLIDAS para permitir unir. */
  readonly minTracks: number;
  /** Máximo de pistas en la lista (más allá: rechazo con INVALID_OPTIONS). */
  readonly maxTracks: number;
  /** Tamaño máximo por archivo de entrada (bytes). Entradas van por WORKERFS. */
  readonly maxFileBytes: number;
  /** Suma máxima de tamaños de entrada (bytes). */
  readonly maxTotalBytes: number;
  /** Límite duro de Σ duraciones (ms); null = sin límite duro. */
  readonly maxDurationMs: number | null;
  /** Umbral de AVISO por tamaño estimado de salida (bytes). */
  readonly warnOutputBytes: number;
  /** Umbral de AVISO por duración total estimada (ms). */
  readonly warnDurationMs: number;
}

export interface VirtualizationConfig {
  /** N de pistas a partir del cual se activa la virtualización (>). */
  readonly threshold: number;
  /** Altura de fila en px (fija: la exigencia del cálculo de ventanas). */
  readonly rowHeightPx: number;
  /** Filas extra renderizadas por encima/debajo de la ventana visible. */
  readonly overscan: number;
  /** Altura máxima del contenedor de lista en px cuando virtualiza (scroll interno). */
  readonly maxHeightPx: number;
}

export interface CopyRuleConfig {
  /**
   * Tolerancia (%) entre bitrates medios para permitir `-c copy` con mezcla
   * VBR/CBR en MP3; por encima, re-codificación (D-04).
   */
  readonly bitrateTolerancePct: number;
}

export interface DurationCheckConfig {
  /** Tolerancia absoluta (ms) de la validación post-unión de duración. */
  readonly toleranceMs: number;
  /** Tolerancia proporcional (%) de la validación post-unión. */
  readonly tolerancePct: number;
}

export interface EngineConfig {
  readonly mode: EngineMode;
  /**
   * Base autohospedada con el layout documentado de D-13. null = usar la CDN
   * anclada de abajo. Un mismo `engine-base` sirve ST y MT (si están los archivos).
   */
  readonly base: string | null;
  readonly cdn: EngineCdnUrls;
  /** Tras salidas mayores que esto (bytes) se hace terminate() para liberar heap. */
  readonly restartAfterBytes: number;
  /** Pesos de las etapas para el progreso global (suma 1). */
  readonly progressWeights: Readonly<Record<'engineLoad' | 'probe' | 'merge' | 'validate', number>>;
}

export interface I18nConfig {
  readonly locale: string;
}

export interface AudioMergerConfig {
  readonly limits: LimitsConfig;
  readonly virtualization: VirtualizationConfig;
  readonly copyRule: CopyRuleConfig;
  readonly durationCheck: DurationCheckConfig;
  readonly engine: EngineConfig;
  readonly i18n: I18nConfig;
  /**
   * Patrón del nombre de salida: {ext} = extensión, {n} = nº de pistas,
   * {fecha} = AAAAMMDD-HHMM. Sin variables desconocidas (validado).
   */
  readonly outputNamePattern: string;
}

/** Constantes técnicas ancladas (justificadas): versión exacta del core. */
const CORE_ST = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
const CORE_MT = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd';

export const DEFAULT_CONFIG: Readonly<AudioMergerConfig> = {
  limits: {
    minTracks: 2,
    maxTracks: 500,
    // 2 GB por archivo: las entradas se transmiten (WORKERFS), no se copian a RAM.
    maxFileBytes: 2 * 1024 * 1024 * 1024,
    // 8 GB en total: cota de sentido común para Σ entradas.
    maxTotalBytes: 8 * 1024 * 1024 * 1024,
    maxDurationMs: null, // sin límite duro de duración por defecto (solo aviso)
    // 350 MB: por debajo del techo práctico de salida en móvil (~400–500 MB),
    // para que el aviso llegue antes justo donde la memoria es más escasa (D-05).
    warnOutputBytes: 350 * 1024 * 1024,
    warnDurationMs: 2 * 60 * 60 * 1000, // 2 h
  },
  virtualization: {
    threshold: 50, // el caso común documentado es ≤ 50 (D-06)
    rowHeightPx: 72,
    overscan: 4,
    maxHeightPx: 480, // scroll interno cuando virtualiza; del tamaño de un viewport móvil
  },
  copyRule: {
    bitrateTolerancePct: 15,
  },
  durationCheck: {
    toleranceMs: 2000,
    tolerancePct: 2,
  },
  engine: {
    mode: 'auto',
    base: null,
    cdn: {
      coreJs: `${CORE_ST}/ffmpeg-core.js`,
      coreWasm: `${CORE_ST}/ffmpeg-core.wasm`,
      coreWorkerJs: `${CORE_MT}/ffmpeg-core.worker.js`,
      coreMtJs: `${CORE_MT}/ffmpeg-core.js`,
      coreMtWasm: `${CORE_MT}/ffmpeg-core.wasm`,
    },
    restartAfterBytes: 1024 * 1024 * 1024, // 1 GB (D-05)
    progressWeights: { engineLoad: 0.05, probe: 0.1, merge: 0.8, validate: 0.05 },
  },
  i18n: {
    locale: 'es',
  },
  outputNamePattern: 'audio-unido-{fecha}.{ext}',
};

/** Códigos de error que la UI muestra con botón de reintento. */
export const RETRYABLE_CODES: readonly ErrorCode[] = ['WASM_LOAD_FAILED', 'UNKNOWN_ENGINE_ERROR', 'PROBE_FAILED'];
