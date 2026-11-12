/**
 * Tabla de atributos HTML del componente (FASE 3) y su parseo PURO a overrides
 * de configuración/opciones. El componente (FASE 5) lee sus atributos con esta
 * tabla: ningún atributo se procesa a mano fuera de aquí (cero hardcoding).
 *
 * Convención de nombres: kebab-case en HTML → ruta de configuración en camelCase.
 */
import { MergeError } from '../core/errors';

export type TipoAtributo = 'cadena' | 'entero' | 'numero' | 'booleano' | 'enum';

export interface DescriptorAtributo {
  /** Nombre exacto del atributo HTML (kebab-case). */
  readonly nombre: string;
  readonly tipo: TipoAtributo;
  /** Ruta del override de configuración (p. ej. 'limits.maxTracks') o null. */
  readonly rutaConfig: string | null;
  /** Clave de opción de unión que alimenta (p. ej. 'fadeMs') o null. */
  readonly claveOpcion: string | null;
  /** Para tipo 'enum'. */
  readonly valores?: readonly string[];
  /** Unidad de escala (los MB/min del HTML se convierten a bytes/ms). */
  readonly escala?: number;
  /** Valor permitido vacío/nulo (p. ej. max-duration-min vacío = sin límite). */
  readonly permiteVacio?: boolean;
}

export const ATRIBUTOS: readonly DescriptorAtributo[] = [
  { nombre: 'locale', tipo: 'cadena', rutaConfig: 'i18n.locale', claveOpcion: null },
  { nombre: 'theme', tipo: 'enum', valores: ['auto', 'light', 'dark'], rutaConfig: null, claveOpcion: null },
  { nombre: 'headless', tipo: 'booleano', rutaConfig: null, claveOpcion: null },

  { nombre: 'format', tipo: 'cadena', rutaConfig: null, claveOpcion: 'format' },
  { nombre: 'bitrate', tipo: 'entero', rutaConfig: null, claveOpcion: 'bitrateKbps', permiteVacio: true },
  { nombre: 'fade-ms', tipo: 'entero', rutaConfig: null, claveOpcion: 'fadeMs' },

  { nombre: 'engine-base', tipo: 'cadena', rutaConfig: 'engine.base', claveOpcion: null, permiteVacio: true },
  { nombre: 'engine-mode', tipo: 'enum', valores: ['auto', 'single', 'multi'], rutaConfig: 'engine.mode', claveOpcion: null },

  { nombre: 'min-tracks', tipo: 'entero', rutaConfig: 'limits.minTracks', claveOpcion: null },
  { nombre: 'max-tracks', tipo: 'entero', rutaConfig: 'limits.maxTracks', claveOpcion: null },
  { nombre: 'max-file-mb', tipo: 'numero', rutaConfig: 'limits.maxFileBytes', claveOpcion: null, escala: 1024 * 1024 },
  { nombre: 'max-total-mb', tipo: 'numero', rutaConfig: 'limits.maxTotalBytes', claveOpcion: null, escala: 1024 * 1024 },
  { nombre: 'warn-output-mb', tipo: 'numero', rutaConfig: 'limits.warnOutputBytes', claveOpcion: null, escala: 1024 * 1024 },
  { nombre: 'max-duration-min', tipo: 'numero', rutaConfig: 'limits.maxDurationMs', claveOpcion: null, escala: 60_000, permiteVacio: true },
  { nombre: 'virtualize-threshold', tipo: 'entero', rutaConfig: 'virtualization.threshold', claveOpcion: null },
  { nombre: 'output-name', tipo: 'cadena', rutaConfig: 'outputNamePattern', claveOpcion: null },
];

export interface AtributoParseado {
  readonly descriptor: DescriptorAtributo;
  /** Valor tipado (number|boolean|string|null). */
  readonly valor: unknown;
}

/**
 * Parsea el valor textual de un atributo según su descriptor.
 * Errores: CONFIG_INVALID con el nombre del atributo (nunca se ignora un valor
 * ilegible en silencio). El valor null solo se admite si `permiteVacio`.
 */
export function parseAtributo(nombre: string, valorBruto: string | null): AtributoParseado | null {
  const descriptor = ATRIBUTOS.find((a) => a.nombre === nombre);
  if (!descriptor) return null; // atributo desconocido: la UI decide avisar, aquí no hay contrato

  if (valorBruto === null || (descriptor.permiteVacio === true && valorBruto.trim() === '')) {
    if (descriptor.permiteVacio) return { descriptor, valor: null };
    throw new MergeError({
      code: 'CONFIG_INVALID',
      message: `el atributo «${nombre}» no puede estar vacío`,
      details: { atributo: nombre, tipo: descriptor.tipo },
    });
  }

  const texto = valorBruto.trim();
  switch (descriptor.tipo) {
    case 'cadena': {
      if (texto.length === 0) {
        throw new MergeError({ code: 'CONFIG_INVALID', message: `el atributo «${nombre}» está vacío`, details: { atributo: nombre } });
      }
      return { descriptor, valor: texto };
    }
    case 'entero': {
      const n = Number(texto);
      if (!Number.isInteger(n)) {
        throw new MergeError({ code: 'CONFIG_INVALID', message: `el atributo «${nombre}» debe ser un entero (recibido: «${valorBruto}»)`, details: { atributo: nombre, recibido: valorBruto } });
      }
      return { descriptor, valor: descriptor.escala ? n * descriptor.escala : n };
    }
    case 'numero': {
      const n = Number(texto);
      if (!Number.isFinite(n)) {
        throw new MergeError({ code: 'CONFIG_INVALID', message: `el atributo «${nombre}» debe ser un número (recibido: «${valorBruto}»)`, details: { atributo: nombre, recibido: valorBruto } });
      }
      return { descriptor, valor: descriptor.escala ? n * descriptor.escala : n };
    }
    case 'booleano': {
      // Semántica HTML de atributo booleano: presente ("" o sin valor) = true.
      const v = texto.toLowerCase();
      if (texto === '' || ['true', '1', 'yes', 'si', 'sí'].includes(v)) {
        return { descriptor, valor: true };
      }
      if (['false', '0', 'no'].includes(v)) {
        return { descriptor, valor: false };
      }
      throw new MergeError({ code: 'CONFIG_INVALID', message: `el atributo «${nombre}» debe ser booleano (recibido: «${valorBruto}»)`, details: { atributo: nombre, recibido: valorBruto } });
    }
    case 'enum': {
      if (!descriptor.valores?.includes(texto)) {
        throw new MergeError({
          code: 'CONFIG_INVALID',
          message: `el atributo «${nombre}» debe ser uno de: ${descriptor.valores?.join(', ') ?? '—'} (recibido: «${valorBruto}»)`,
          details: { atributo: nombre, recibido: valorBruto, permitidos: descriptor.valores ?? [] },
        });
      }
      return { descriptor, valor: texto };
    }
  }
}

/** Convierte un atributo parseado en el fragmento de override de configuración. */
export function overrideDeAtributo(p: AtributoParseado): Record<string, unknown> | null {
  if (p.descriptor.rutaConfig === null) return null;
  const tramo = p.descriptor.rutaConfig.split('.');
  const salida: Record<string, unknown> = {};
  let cursor: Record<string, unknown> = salida;
  for (let i = 0; i < tramo.length; i++) {
    const clave = tramo[i]!;
    if (i === tramo.length - 1) cursor[clave] = p.valor;
    else {
      cursor[clave] = {};
      cursor = cursor[clave] as Record<string, unknown>;
    }
  }
  return salida;
}

/**
 * Parsea TODO el conjunto de atributos declarado en un elemento y produce:
 * - overrides de configuración (para resolverConfig)
 * - valores de opciones de unión (validados aparte contra los esquemas)
 * - valores estructurales (theme/headless) que no van a la config
 */
export function parseAtributos(atributos: Readonly<Record<string, string | null>>): {
  overridesConfig: Record<string, unknown>;
  opciones: Record<string, unknown>;
  estructural: Record<string, unknown>;
} {
  const overridesConfig: Record<string, unknown> = {};
  const opciones: Record<string, unknown> = {};
  const estructural: Record<string, unknown> = {};
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === null) continue;
    const parseado = parseAtributo(nombre, valor);
    if (!parseado) continue;
    if (parseado.descriptor.claveOpcion) {
      opciones[parseado.descriptor.claveOpcion] = parseado.valor;
    } else if (parseado.descriptor.rutaConfig) {
      const frag = overrideDeAtributo(parseado);
      if (frag) fusionarEn(overridesConfig, frag);
    } else {
      estructural[parseado.descriptor.nombre] = parseado.valor;
    }
  }
  return { overridesConfig, opciones, estructural };
}

function fusionarEn(destino: Record<string, unknown>, fragmento: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(fragmento)) {
    if (v && typeof v === 'object' && destino[k] && typeof destino[k] === 'object') {
      fusionarEn(destino[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      destino[k] = v;
    }
  }
}
