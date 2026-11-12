/**
 * Validador declarativo de opciones (FASE 2).
 *
 * Problema que resuelve: las opciones de unión deben validarse contra un esquema
 * que pueden EXTENDER terceros (Regla del Carro) sin tocar esta función.
 * Coste: una capa de descripción de datos en vez de `if`s ad hoc.
 * Alternativa descartada: ajv + JSON Schema (≈ 35 KB gzip min por el presupuesto
 * de 30 KB — ver D-08).
 */
import { MergeError } from './errors';

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

const esEntero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v);
const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Valida un objeto de opciones contra los esquemas registrados.
 * Las claves desconocidas se RECHAZAN (nunca se ignoran en silencio).
 * Devuelve la lista de problemas (vacía = válido).
 */
export function validateOptionValues(
  options: Readonly<Record<string, unknown>>,
  schemas: readonly OptionSchema[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [key, value] of Object.entries(options)) {
    const schema = schemas.find((s) => s.key === key);
    if (!schema) {
      issues.push({ key, esperado: 'una opción registrada', recibido: value });
      continue;
    }
    if (value === null) {
      if (!schema.nullable) issues.push({ key, esperado: `${schema.type} no nulo`, recibido: value });
      continue;
    }
    switch (schema.type) {
      case 'int': {
        if (!esEntero(value)) { issues.push({ key, esperado: 'entero', recibido: value }); break; }
        if (schema.min !== undefined && value < schema.min) issues.push({ key, esperado: `≥ ${schema.min}`, recibido: value });
        if (schema.max !== undefined && value > schema.max) issues.push({ key, esperado: `≤ ${schema.max}`, recibido: value });
        break;
      }
      case 'number': {
        if (!esNumero(value)) { issues.push({ key, esperado: 'número', recibido: value }); break; }
        if (schema.min !== undefined && value < schema.min) issues.push({ key, esperado: `≥ ${schema.min}`, recibido: value });
        if (schema.max !== undefined && value > schema.max) issues.push({ key, esperado: `≤ ${schema.max}`, recibido: value });
        break;
      }
      case 'enum': {
        if (typeof value !== 'string') { issues.push({ key, esperado: 'una de las opciones', recibido: value }); break; }
        const valores = typeof schema.values === 'function' ? schema.values(options) : schema.values ?? [];
        if (!valores.includes(value)) issues.push({ key, esperado: `uno de: ${valores.join(', ')}`, recibido: value });
        break;
      }
      case 'bool': {
        if (typeof value !== 'boolean') issues.push({ key, esperado: 'booleano', recibido: value });
        break;
      }
      case 'string': {
        if (typeof value !== 'string' || value.length === 0) issues.push({ key, esperado: 'texto no vacío', recibido: value });
        break;
      }
    }
  }
  return issues;
}

/** Aplica los valores por defecto de los esquemas para las claves ausentes. */
export function aplicarDefaults(
  options: Readonly<Record<string, unknown>>,
  schemas: readonly OptionSchema[],
): Record<string, unknown> {
  const salida: Record<string, unknown> = { ...options };
  for (const s of schemas) {
    if (!(s.key in salida) && s.default !== undefined) salida[s.key] = s.default;
  }
  return salida;
}

/** Lanza INVALID_OPTIONS con los detalles si hay problemas (versión estricta). */
export function asegurarOpciones(
  options: Readonly<Record<string, unknown>>,
  schemas: readonly OptionSchema[],
): void {
  const issues = validateOptionValues(options, schemas);
  if (issues.length > 0) {
    throw new MergeError({
      code: 'INVALID_OPTIONS',
      message: issues.map((i) => `${i.key}: se esperaba ${i.esperado}, se recibió ${JSON.stringify(i.recibido)}`).join('; '),
      details: { issues },
    });
  }
}

/**
 * Invariantes de entidades (FASE 2): ids únicos y orden estable.
 * Complejidad O(N) sobre la lista de ids.
 */
export function idsUnicos(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length;
}

export function ordenValido(ids: readonly string[], porId: ReadonlyMap<string, unknown>): boolean {
  return idsUnicos(ids) && ids.every((id) => porId.has(id));
}

/**
 * Validación de reorden: índices dentro de rango y sin duplicados.
 * `de`/`a` son posiciones (0-based) en la lista actual.
 */
export function indicesReordenValidos(n: number, de: number, a: number): boolean {
  return Number.isInteger(de) && Number.isInteger(a) && de >= 0 && a >= 0 && de < n && a < n;
}
