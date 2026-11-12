/**
 * Validación y resolución de la configuración global (FASE 2).
 * La configuración inválida se RECHAZA con CONFIG_INVALID y detalles accionables;
 * nunca se corrige en silencio (tolerancia a fallos: error de configuración ≠ dato faltante).
 */
import { MergeError } from '../core/errors';
import { DEFAULT_CONFIG, type AudioMergerConfig } from './defaults';

type Genérico = Record<string, unknown>;

/** Fusión profunda: los objetos se combinan, los primitivos y arrays se sustituyen. */
export function fusionProfunda<T extends Genérico>(base: T, cambios: Genérico | null | undefined): T {
  if (!cambios || typeof cambios !== 'object') return base;
  const salida: Genérico = { ...base };
  for (const [k, v] of Object.entries(cambios)) {
    const b = (base as Genérico)[k];
    salida[k] =
      v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)
        ? fusionProfunda(b as Genérico, v as Genérico)
        : v;
  }
  return salida as T;
}

/** Claves de `cambios` que no existen en la forma de `base` (recursivo, rutas con punto). */
export function clavesDesconocidas(base: unknown, cambios: unknown, ruta = ''): string[] {
  if (!cambios || typeof cambios !== 'object' || Array.isArray(cambios)) return [];
  if (!base || typeof base !== 'object' || Array.isArray(base)) return [];
  const problemas: string[] = [];
  for (const [k, v] of Object.entries(cambios as Record<string, unknown>)) {
    if (!Object.hasOwn(base as Record<string, unknown>, k)) {
      problemas.push(`${ruta}${k}`);
    } else {
      problemas.push(...clavesDesconocidas((base as Record<string, unknown>)[k], v, `${ruta}${k}.`));
    }
  }
  return problemas;
}

const PATRON_URL = /^(https?:\/\/|\/)/i;
const VARIABLES_NOMBRE = ['{ext}', '{n}', '{fecha}'] as const;

/** Reglas de la configuración. Devuelve la lista de problemas (vacía = válida). */
export function problemasDeConfig(c: AudioMergerConfig): string[] {
  const p: string[] = [];
  const { limits, virtualization, copyRule, durationCheck, engine, i18n, outputNamePattern } = c;

  // Claves desconocidas: nunca se ignoran en silencio (un typo de atributo debe fallar).
  const desconocidas = clavesDesconocidas(DEFAULT_CONFIG, c);
  if (desconocidas.length > 0) p.push(`claves desconocidas: ${desconocidas.join(', ')}`);

  if (!Number.isInteger(limits.minTracks) || limits.minTracks < 1) p.push('limits.minTracks debe ser entero ≥ 1');
  if (!Number.isInteger(limits.maxTracks) || limits.maxTracks < limits.minTracks) p.push('limits.maxTracks debe ser ≥ limits.minTracks');
  if (!Number.isFinite(limits.maxFileBytes) || limits.maxFileBytes <= 0) p.push('limits.maxFileBytes debe ser > 0');
  if (!Number.isFinite(limits.maxTotalBytes) || limits.maxTotalBytes < limits.maxFileBytes) p.push('limits.maxTotalBytes debe ser ≥ limits.maxFileBytes');
  if (limits.maxDurationMs !== null && (!(Number.isFinite(limits.maxDurationMs)) || limits.maxDurationMs <= 0)) p.push('limits.maxDurationMs debe ser > 0 o null');
  if (!Number.isFinite(limits.warnOutputBytes) || limits.warnOutputBytes <= 0) p.push('limits.warnOutputBytes debe ser > 0');
  if (!Number.isFinite(limits.warnDurationMs) || limits.warnDurationMs <= 0) p.push('limits.warnDurationMs debe ser > 0');

  if (!Number.isInteger(virtualization.threshold) || virtualization.threshold < 1) p.push('virtualization.threshold debe ser entero ≥ 1');
  if (!Number.isFinite(virtualization.rowHeightPx) || virtualization.rowHeightPx < 8) p.push('virtualization.rowHeightPx debe ser ≥ 8');
  if (!Number.isInteger(virtualization.overscan) || virtualization.overscan < 0) p.push('virtualization.overscan debe ser entero ≥ 0');
  if (!Number.isFinite(virtualization.maxHeightPx) || virtualization.maxHeightPx < 120) p.push('virtualization.maxHeightPx debe ser ≥ 120');

  if (!Number.isFinite(copyRule.bitrateTolerancePct) || copyRule.bitrateTolerancePct < 0 || copyRule.bitrateTolerancePct > 100) p.push('copyRule.bitrateTolerancePct debe estar en [0, 100]');

  if (!Number.isFinite(durationCheck.toleranceMs) || durationCheck.toleranceMs < 0) p.push('durationCheck.toleranceMs debe ser ≥ 0');
  if (!Number.isFinite(durationCheck.tolerancePct) || durationCheck.tolerancePct < 0 || durationCheck.tolerancePct > 100) p.push('durationCheck.tolerancePct debe estar en [0, 100]');

  if (!['auto', 'single', 'multi'].includes(engine.mode)) p.push('engine.mode debe ser auto|single|multi');
  if (engine.base !== null && !PATRON_URL.test(engine.base)) p.push('engine.base debe ser URL absoluta (http/https) o ruta absoluta ("/…")');
  for (const [k, v] of Object.entries(engine.cdn)) {
    if (typeof v !== 'string' || !/^https?:\/\//i.test(v)) p.push(`engine.cdn.${k} debe ser URL http(s)`);
  }
  if (!Number.isFinite(engine.restartAfterBytes) || engine.restartAfterBytes <= 0) p.push('engine.restartAfterBytes debe ser > 0');
  const pesos = engine.progressWeights;
  const suma = pesos.engineLoad + pesos.probe + pesos.merge + pesos.validate;
  if (Object.values(pesos).some((v) => !Number.isFinite(v) || v < 0) || Math.abs(suma - 1) > 1e-6) p.push('engine.progressWeights: valores ≥ 0 y suma 1');

  if (typeof i18n.locale !== 'string' || i18n.locale.length === 0) p.push('i18n.locale debe ser texto no vacío');

  if (typeof outputNamePattern !== 'string' || !outputNamePattern.includes('{ext}')) p.push('outputNamePattern debe contener {ext}');
  if (/\{[^}]*\}/.test(outputNamePattern.replace(/\{ext\}|\{n\}|\{fecha\}/g, ''))) p.push(`outputNamePattern solo admite variables ${VARIABLES_NOMBRE.join(', ')}`);

  return p;
}

/** Lanza CONFIG_INVALID con la lista de problemas. */
export function validarConfig(c: AudioMergerConfig): void {
  const p = problemasDeConfig(c);
  if (p.length > 0) {
    throw new MergeError({
      code: 'CONFIG_INVALID',
      message: `Configuración inválida: ${p.join(' · ')}`,
      details: { problemas: p },
    });
  }
}

/** Congela en profundidad (los registros siguen siendo mutables aparte, no esta config). */
export function congelar<T>(obj: T): Readonly<T> {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj as Genérico)) if (v && typeof v === 'object') congelar(v);
  }
  return obj as Readonly<T>;
}

function clonEstructural<T>(valor: T): T {
  return (typeof structuredClone === 'function' ? structuredClone(valor) : JSON.parse(JSON.stringify(valor))) as T;
}

/**
 * Resuelve la configuración efectiva: defaults ← overrides → validar → congelar.
 * `overrides` proviene de los atributos del componente (parseados y tipados por la UI).
 * Las claves desconocidas se RECHAZAN (un typo como `maxTrack` no puede pasar en
 * silencio con el valor por defecto — regla de tolerancia a fallos).
 */
export function resolverConfig(overrides?: Genérico | null): Readonly<AudioMergerConfig> {
  const desconocidas = overrides ? clavesDesconocidas(DEFAULT_CONFIG, overrides) : [];
  if (desconocidas.length > 0) {
    throw new MergeError({
      code: 'CONFIG_INVALID',
      message: `Configuración con claves desconocidas: ${desconocidas.join(', ')}`,
      details: { desconocidas },
    });
  }
  // Clon propio para no congelar el DEFAULT_CONFIG compartido del módulo.
  const base = clonEstructural(DEFAULT_CONFIG);
  const fusionada = overrides ? fusionProfunda(base, overrides) : base;
  validarConfig(fusionada);
  return congelar(fusionada);
}
