import { type AudioMergerConfig } from './defaults';
type Genérico = Record<string, unknown>;
/** Fusión profunda: los objetos se combinan, los primitivos y arrays se sustituyen. */
export declare function fusionProfunda<T extends Genérico>(base: T, cambios: Genérico | null | undefined): T;
/** Claves de `cambios` que no existen en la forma de `base` (recursivo, rutas con punto). */
export declare function clavesDesconocidas(base: unknown, cambios: unknown, ruta?: string): string[];
/** Reglas de la configuración. Devuelve la lista de problemas (vacía = válida). */
export declare function problemasDeConfig(c: AudioMergerConfig): string[];
/** Lanza CONFIG_INVALID con la lista de problemas. */
export declare function validarConfig(c: AudioMergerConfig): void;
/** Congela en profundidad (los registros siguen siendo mutables aparte, no esta config). */
export declare function congelar<T>(obj: T): Readonly<T>;
/**
 * Resuelve la configuración efectiva: defaults ← overrides → validar → congelar.
 * `overrides` proviene de los atributos del componente (parseados y tipados por la UI).
 * Las claves desconocidas se RECHAZAN (un typo como `maxTrack` no puede pasar en
 * silencio con el valor por defecto — regla de tolerancia a fallos).
 */
export declare function resolverConfig(overrides?: Genérico | null): Readonly<AudioMergerConfig>;
export {};
