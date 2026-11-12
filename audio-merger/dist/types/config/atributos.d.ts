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
export declare const ATRIBUTOS: readonly DescriptorAtributo[];
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
export declare function parseAtributo(nombre: string, valorBruto: string | null): AtributoParseado | null;
/** Convierte un atributo parseado en el fragmento de override de configuración. */
export declare function overrideDeAtributo(p: AtributoParseado): Record<string, unknown> | null;
/**
 * Parsea TODO el conjunto de atributos declarado en un elemento y produce:
 * - overrides de configuración (para resolverConfig)
 * - valores de opciones de unión (validados aparte contra los esquemas)
 * - valores estructurales (theme/headless) que no van a la config
 */
export declare function parseAtributos(atributos: Readonly<Record<string, string | null>>): {
    overridesConfig: Record<string, unknown>;
    opciones: Record<string, unknown>;
    estructural: Record<string, unknown>;
};
