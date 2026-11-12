import type { AudioTrack, MergeOptions, MergeOutput } from '../core/types';
export declare const VERSION = "1.0.0";
export declare const NOMBRE_ELEMENTO = "audio-merger";
/** Base del elemento: HTMLElement real o clase neutra en entornos sin DOM (Node).
 *  Así la librería puede importarse en Node (tests/SSR) sin definir el custom element. */
declare const BaseElement: typeof HTMLElement;
export declare class AudioMergerElement extends BaseElement {
    static get observedAttributes(): readonly string[];
    private estado;
    private config;
    private motor;
    private controlador;
    private archivos;
    private sombra;
    private hoja;
    private filas;
    private idArrastrandose;
    private avisoResolver;
    /** true mientras una unión está en vuelo (incluye el diálogo de aviso): un solo job. */
    private unionEnCurso;
    constructor();
    private attachShadowIfPossible;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_nombre: string, viejo: string | null, nuevo: string | null): void;
    private leerAtributos;
    private aplicarAtributos;
    private estructural;
    get tracks(): readonly AudioTrack[];
    get options(): MergeOptions;
    get state(): 'idle' | 'analyzing' | 'running' | 'completed' | 'error' | 'cancelled';
    get result(): MergeOutput | null;
    get version(): string;
    addFiles(entrada: FileList | File[] | File): Promise<readonly AudioTrack[]>;
    removeTrack(id: string): boolean;
    reorder(de: number, a: number): readonly string[];
    moveTrack(id: string, delta: number): readonly string[];
    setOptions(parcial: Partial<MergeOptions>): MergeOptions;
    reset(): void;
    clear(): void;
    preloadEngine(): Promise<void>;
    merge(): Promise<MergeOutput>;
    cancel(): void;
    download(): void;
    private ejecutarUnion;
    private unionInterna;
    /** Marca como inválidas las pistas citadas por un fallo de sonda clasificado. */
    private marcarPistasInvalidas;
    private completarDuracion;
    private renderizarCompleto;
    private temaActual;
    private ref;
    private renderizarTextos;
    private conectarEventos;
    private renderizarHerramientas;
    private campoSelect;
    private virtualActiva;
    private renderizarLista;
    private ventanaVisible;
    private crearFila;
    private accionFila;
    private actualizarFila;
    private renderizarEstado;
    private renderizarResultado;
    private renderizarError;
    private renderizarDialogoAviso;
    private cerrarDialogoAviso;
    private anunciar;
    private devolverFoco;
    /** Parámetros de interpolación COMPLETOS a partir de err.details (sin fugas de {tokens}). */
    private parametrosDeError;
    private mensajeDeError;
    private consejoDeError;
    /** Revoca una object URL si el entorno lo soporta (jsdom/SSR no la tienen). */
    private revocarURL;
    private emitir;
}
/** Registra el elemento si el entorno lo permite (guarda para Node/tests/SSR). */
export declare function registrarElemento(): void;
export {};
