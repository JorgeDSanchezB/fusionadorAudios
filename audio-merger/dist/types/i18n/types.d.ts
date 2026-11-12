/** Contrato de los mapas de mensajes. */
export interface MessageMap {
    readonly [clave: string]: string;
}
/** Parámetros de interpolación {clave}. */
export type MessageParams = Readonly<Record<string, string | number>>;
