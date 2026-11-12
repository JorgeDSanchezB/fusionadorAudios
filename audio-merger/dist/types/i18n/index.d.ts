import type { MessageMap, MessageParams } from './types';
export declare function registrarLocale(locale: string, mensajes: MessageMap): void;
export declare function fijarLocale(locale: string): void;
export declare function localeActivo(): string;
export declare function localesDisponibles(): readonly string[];
/** Traduce con interpolación {clave}. Si falta la clave: marcador técnico visible (no silencioso). */
export declare function t(clave: string, params?: MessageParams): string;
