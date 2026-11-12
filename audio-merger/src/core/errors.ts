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
export const CODIGOS_ERROR = [
  'UNSUPPORTED_FORMAT',   // formato de entrada no registrado
  'FILE_TOO_LARGE',       // un archivo supera limits.maxFileBytes
  'TOTAL_TOO_LARGE',      // la suma de entradas supera limits.maxTotalBytes
  'DURATION_TOO_LONG',    // Σ duraciones supera limits.maxDurationMs (si está fijado)
  'OUT_OF_MEMORY',        // heurística por patrón de log del core (OOM/abort)
  'WASM_LOAD_FAILED',     // red/CSP/archivo del core inaccesible o corrupto
  'BROWSER_UNSUPPORTED',  // sin Worker/WASM: no hay degradación posible
  'USER_CANCELLED',       // cancelación explícita (AbortSignal o botón)
  'INVALID_ORDER',        // reorden inválido (índices fuera de rango, ids desconocidos)
  'INVALID_OPTIONS',      // opciones de unión rechazadas por el validador
  'NOT_ENOUGH_TRACKS',    // menos pistas válidas que limits.minTracks
  'TOO_MANY_TRACKS',      // se superó limits.maxTracks al añadir
  'CORRUPT_FILE',         // la sonda no pudo abrir el archivo (datos inválidos)
  'CONFIG_INVALID',       // configuración global rechazada (atributos del componente)
  'JOB_IN_PROGRESS',      // política de cola: ya hay un job activo
  'WORKERFS_UNAVAILABLE', // el core no registró WORKERFS (D-05)
  'PROBE_FAILED',         // la sonda falló de forma no clasificable
  'UNKNOWN_ENGINE_ERROR', // error del motor sin clasificar (último recurso)
] as const;

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
export class MergeError extends Error {
  readonly code: ErrorCode;
  readonly details: ErrorDetails;
  readonly cause?: unknown;

  constructor(init: MergeErrorInit) {
    super(init.message);
    this.name = 'MergeError';
    this.code = init.code;
    this.details = init.details ?? {};
    this.cause = init.cause;
  }

  /** Serialización estable para eventos y logs (el `cause` no se serializa). */
  toJSON(): { code: ErrorCode; message: string; details: ErrorDetails } {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export const isMergeError = (e: unknown): e is MergeError => e instanceof MergeError;

/**
 * Envuelve cualquier error desconocido en un MergeError clasificado.
 * Clasifica por patrones cuando es posible; el resto es UNKNOWN_ENGINE_ERROR
 * (se preserva la causa original, no se oculta).
 */
export function toMergeError(e: unknown, fallbackCode: ErrorCode = 'UNKNOWN_ENGINE_ERROR'): MergeError {
  if (isMergeError(e)) return e;
  const texto = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  // La cancelación se comprueba PRIMERO: es una intención explícita del usuario y
  // no debe quedar eclipsada por patrones de texto accidentales.
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new MergeError({ code: 'USER_CANCELLED', message: texto, cause: e });
  }
  // Clasificación heurística de fallos de infraestructura del motor (exige
  // contexto de Worker/importScripts: un «SecurityError» suelto no es necesariamente CSP):
  if (/SecurityError[^\n]*(Worker|importScripts)|(Worker|importScripts)[^\n]*SecurityError|Failed to construct ['"]?Worker|importScripts/i.test(texto)) {
    return new MergeError({ code: 'WASM_LOAD_FAILED', message: texto, details: { pista: 'csp-worker' }, cause: e });
  }
  if (/out of memory|memory alloc|abort\(OOM\)|RangeError.*allocation/i.test(texto)) {
    return new MergeError({ code: 'OUT_OF_MEMORY', message: texto, cause: e });
  }
  return new MergeError({ code: fallbackCode, message: texto, cause: e });
}

/** Códigos de error que NO deben reiniciar flujos por defecto (informativos). */
export const NO_RETRY_CODES: readonly ErrorCode[] = ['USER_CANCELLED', 'JOB_IN_PROGRESS'];
