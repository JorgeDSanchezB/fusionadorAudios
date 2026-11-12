import type { OptionSchema } from '../core/validation';
import type { Sniffer } from '../core/validar-salida';
import type { MergePlan } from '../core/types';
import type { AudioMergerConfig } from './defaults';
import type { ProbeInfo } from '../core/types';
export interface DescriptorFormatoEntrada {
    /** Id estable (minúsculas), p. ej. 'mp3'. */
    readonly id: string;
    /** Extensiones aceptadas (sin punto, minúsculas). */
    readonly extensions: readonly string[];
    /** MIME types aceptados (minúsculas). */
    readonly mimeTypes: readonly string[];
    /** Clave i18n con la etiqueta visible. */
    readonly etiquetaKey: string;
}
export declare function registrarFormatoEntrada(d: DescriptorFormatoEntrada): void;
export declare function formatosEntradaRegistrados(): readonly DescriptorFormatoEntrada[];
export declare function buscarFormatoEntrada(nombreArchivo: string, mimeType: string): DescriptorFormatoEntrada | null;
export interface DescriptorFormatoSalida {
    readonly id: string;
    readonly etiquetaKey: string;
    readonly mimeType: string;
    readonly extension: string;
    /** Códec ffmpeg de re-codificación (p. ej. 'libmp3lame', 'pcm_s16le'). */
    readonly codec: string;
    /**
     * Argumentos de codificación a partir del bitrate (null cuando el formato no
     * usa bitrate, p. ej. WAV). Incluye normalización de tasa/canales.
     */
    readonly argsCodificacion: (bitrateKbps: number | null) => readonly string[];
    /** Bitrates ofrecidos (kbps) o null si el formato no los usa. */
    readonly bitratesKbps: readonly number[] | null;
    readonly bitratePorDefecto: number | null;
    /** Perfil de salida para `aformat` del filtro concat. */
    readonly sampleRateHz: number;
    readonly canales: 1 | 2;
    /** Bytes/segundo estimados de salida (para la estimación previa). */
    readonly bytesPorSegundo: (bitrateKbps: number | null) => number | null;
    /** Sniffer del contenedor de salida (validación post-unión). */
    readonly sniff: Sniffer;
    /** Códecs de entrada NATIVOS de este formato: con ellos se permite `-c copy`. */
    readonly codecsNativosParaCopia: readonly string[];
}
export declare function registrarFormatoSalida(d: DescriptorFormatoSalida): void;
export declare function formatosSalidaRegistrados(): readonly DescriptorFormatoSalida[];
export declare function formatoSalida(id: string): DescriptorFormatoSalida | null;
export interface DescriptorOpcion {
    readonly esquema: OptionSchema;
    /** Clave i18n con la etiqueta visible (UI/selectores). */
    readonly etiquetaKey: string;
}
export declare function registrarOpcion(descriptor: DescriptorOpcion): void;
/** Esquemas de TODAS las opciones registradas (format y bitrate son estructurales). */
export declare function esquemasOpcionesRegistradas(): readonly OptionSchema[];
export declare function esquemaDeOpcion(clave: string): OptionSchema | null;
/** Plan estructural intermedio que los post-procesos transforman antes de compilar. */
export interface PlanEstructural {
    strategy: 'copy' | 'reencode';
    /** Rutas internas de entrada en orden (p1.ext…). */
    readonly rutasInternas: readonly string[];
    /** Cadena de filtros por entrada (solo reencode), p. ej. ['afade=t=in:…']. */
    readonly filtros: readonly (readonly string[])[];
    /** Contenido del archivo de lista del demuxer concat (solo copy). */
    listaConcat: readonly string[] | null;
    /** Argumentos del codec de salida (se compilan al final). */
    argsSalida: readonly string[];
    readonly rutaSalida: string;
    readonly salidaMimeType: string;
    readonly salidaExtension: string;
}
export interface ContextoPostProceso {
    readonly sonda: readonly {
        id: string;
        info: ProbeInfo;
    }[];
    readonly opciones: Readonly<Record<string, unknown>>;
    readonly config: Readonly<AudioMergerConfig>;
}
export interface DescriptorPostProceso {
    /** Id estable del paso. */
    readonly id: string;
    /** Opción que lo activa (clave del registro de opciones). */
    readonly optionKey: string;
    /** true → su presencia fuerza re-codificación (no puede aplicar sobre copy). */
    readonly requiereRecodificacion: boolean;
    /** Decide si el paso aplica con las opciones vigentes. */
    readonly aplica: (opciones: Readonly<Record<string, unknown>>) => boolean;
    /** Transforma el plan estructural (puro: añade filtros/cambia strategy). */
    readonly transformar: (plan: PlanEstructural, ctx: ContextoPostProceso) => PlanEstructural;
}
export declare function registrarPostProceso(d: DescriptorPostProceso): void;
/** Post-procesos ACTIVOS con las opciones dadas (en orden de registro). */
export declare function postProcesosActivos(opciones: Readonly<Record<string, unknown>>): readonly DescriptorPostProceso[];
export declare function postProcesosRegistrados(): readonly DescriptorPostProceso[];
/** Nombre interno sanitizado (D-11): p<N>.<ext> — jamás el nombre del usuario. */
export declare function nombreInterno(posicion: number, extension: string, nPistas: number): string;
/** Resete completo (solo para tests y reinicialización explícita). */
export declare function reiniciarRegistros(): void;
/** Reexport de conveniencia para el plan compilado (contrato único). */
export type { MergePlan };
