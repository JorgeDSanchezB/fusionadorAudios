/**
 * Registro de idiomas (D-07). El castellano viene de serie; añadir un idioma es
 * registrar un mapa de mensajes con la MISMA completitud (el test de i18n exige
 * mensaje+consejo para cada ErrorCode).
 */
import { es } from './es';
import type { MessageMap, MessageParams } from './types';

const registros = new Map<string, MessageMap>([['es', es]]);
/** Idioma activo del componente (por defecto, el de la config). */
let activo = 'es';

export function registrarLocale(locale: string, mensajes: MessageMap): void {
  if (typeof locale !== 'string' || locale.length === 0) {
    throw new Error('registrarLocale: el código de idioma no puede estar vacío');
  }
  if (!mensajes || Object.keys(mensajes).length === 0) {
    throw new Error('registrarLocale: el mapa de mensajes no puede estar vacío');
  }
  registros.set(locale, mensajes);
}

export function fijarLocale(locale: string): void {
  if (!registros.has(locale)) {
    throw new Error(`fijarLocale: idioma no registrado «${locale}» (disponibles: ${[...registros.keys()].join(', ')})`);
  }
  activo = locale;
}

export function localeActivo(): string {
  return activo;
}

export function localesDisponibles(): readonly string[] {
  return [...registros.keys()];
}

/** Traduce con interpolación {clave}. Si falta la clave: marcador técnico visible (no silencioso). */
export function t(clave: string, params?: MessageParams): string {
  const mapa = registros.get(activo) ?? es;
  const plantilla = mapa[clave] ?? es[clave];
  if (plantilla === undefined) return `⟨falta texto: ${clave}⟩`;
  if (!params) return plantilla;
  return plantilla.replace(/\{([a-zA-Z0-9_]+)\}/g, ( _, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}
