/**
 * Errores tipados con código estable (FASE 2/FASE 3).
 *
 * Estructura: { code, message (técnico, corto), details, cause }.
 * La UI traduce `code` a mensajes de usuario y consejos accionables vía i18n;
 * el core NO depende de i18n (separación de capas).
 *
 * Los códigos son estables y forman parte del contrato público (tabla en README):
 * el listón exige distinguir formato no soportado / archivo demasiado grande /
 * total demasiado grande / duración excesiva / OOM / carga del WASM fallida /
 * navegador sin soporte / cancelación por el usuario / orden inválido /
 * opciones inválidas / pistas insuficientes / archivo corrupto / configuración
 * inválida / job en curso / WORKERFS no disponible / fallo de sonda / error
 * desconocido del motor.
 */
/** Lista fuente única de verdad de los códigos de error (contrato público estable). */
export declare const CODIGOS_ERROR: readonly ["UNSUPPORTED_FORMAT", "FILE_TOO_LARGE", "TOTAL_TOO_LARGE", "DURATION_TOO_LONG", "OUT_OF_MEMORY", "WASM_LOAD_FAILED", "BROWSER_UNSUPPORTED", "USER_CANCELLED", "INVALID_ORDER", "INVALID_OPTIONS", "NOT_ENOUGH_TRACKS", "TOO_MANY_TRACKS", "CORRUPT_FILE", "CONFIG_INVALID", "JOB_IN_PROGRESS", "WORKERFS_UNAVAILABLE", "PROBE_FAILED", "UNKNOWN_ENGINE_ERROR"];
export type ErrorCode = (typeof CODIGOS_ERROR)[number];
export type ErrorDetails = Readonly<Record<string, unknown>>;
/** Detalles técnicos estructurados para cada código (contrato del detalle). */
export interface MergeErrorInit {
    readonly code: ErrorCode;
    /** Mensaje técnico orientado al desarrollador (castellano, sin jerga críptica). */
    readonly message: string;
    readonly details?: ErrorDetails;
    readonly cause?: unknown;
}
/** Error de dominio. NUNCA se convierte en valor por defecto silencioso. */
export declare class MergeError extends Error {
    readonly code: ErrorCode;
    readonly details: ErrorDetails;
    readonly cause?: unknown;
    constructor(init: MergeErrorInit);
    /** Serialización estable para eventos y logs (el `cause` no se serializa). */
    toJSON(): {
        code: ErrorCode;
        message: string;
        details: ErrorDetails;
    };
}
export declare const isMergeError: (e: unknown) => e is MergeError;
/**
 * Envuelve cualquier error desconocido en un MergeError clasificado.
 * Clasifica por patrones cuando es posible; el resto es UNKNOWN_ENGINE_ERROR
 * (se preserva la causa original, no se oculta).
 */
export declare function toMergeError(e: unknown, fallbackCode?: ErrorCode): MergeError;
/** Códigos de error que NO deben reiniciar flujos por defecto (informativos). */
export declare const NO_RETRY_CODES: readonly ErrorCode[];
