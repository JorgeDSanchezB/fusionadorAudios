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
export declare const DEFAULT_CONFIG: Readonly<AudioMergerConfig>;
/** Códigos de error que la UI muestra con botón de reintento. */
export declare const RETRYABLE_CODES: readonly ErrorCode[];
