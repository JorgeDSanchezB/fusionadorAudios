export type OptionType = 'int' | 'number' | 'enum' | 'bool' | 'string';
export interface OptionSchema {
    readonly key: string;
    readonly type: OptionType;
    readonly min?: number;
    readonly max?: number;
    /** Si el valor `null` es válido (p. ej. bitrate cuando el formato no lo usa). */
    readonly nullable?: boolean;
    /** Para 'enum': valores válidos (estáticos o dependientes de otras opciones). */
    readonly values?: readonly string[] | ((options: Readonly<Record<string, unknown>>) => readonly string[]);
    /** Valor por defecto cuando la clave no está presente (nunca para ocultar errores). */
    readonly default?: unknown;
}
export interface ValidationIssue {
    readonly key: string;
    readonly esperado: string;
    readonly recibido: unknown;
}
/**
 * Valida un objeto de opciones contra los esquemas registrados.
 * Las claves desconocidas se RECHAZAN (nunca se ignoran en silencio).
 * Devuelve la lista de problemas (vacía = válido).
 */
export declare function validateOptionValues(options: Readonly<Record<string, unknown>>, schemas: readonly OptionSchema[]): ValidationIssue[];
/** Aplica los valores por defecto de los esquemas para las claves ausentes. */
export declare function aplicarDefaults(options: Readonly<Record<string, unknown>>, schemas: readonly OptionSchema[]): Record<string, unknown>;
/** Lanza INVALID_OPTIONS con los detalles si hay problemas (versión estricta). */
export declare function asegurarOpciones(options: Readonly<Record<string, unknown>>, schemas: readonly OptionSchema[]): void;
/**
 * Invariantes de entidades (FASE 2): ids únicos y orden estable.
 * Complejidad O(N) sobre la lista de ids.
 */
export declare function idsUnicos(ids: readonly string[]): boolean;
export declare function ordenValido(ids: readonly string[], porId: ReadonlyMap<string, unknown>): boolean;
/**
 * Validación de reorden: índices dentro de rango y sin duplicados.
 * `de`/`a` son posiciones (0-based) en la lista actual.
 */
export declare function indicesReordenValidos(n: number, de: number, a: number): boolean;
