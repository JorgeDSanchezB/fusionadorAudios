import type { EntradaUnion, MotorUnion, ResultadoSonda } from '../core/merge';
import type { MergePlan } from '../core/types';
import type { AudioMergerConfig } from '../config/defaults';
export declare class MotorFfmpeg implements MotorUnion {
    private readonly config;
    private worker;
    private cargado;
    private promesaCarga;
    private pendientes;
    private idSiguiente;
    private lineasLog;
    private oyenteLog;
    private oyenteProgreso;
    constructor(config: Readonly<AudioMergerConfig>);
    /** Líneas de log retenidas (diagnóstico visible en errores del motor). */
    obtenerLog(): readonly string[];
    ensureLoaded(onDescarga?: (fraccion: number) => void): Promise<void>;
    sondear(entradas: readonly EntradaUnion[]): Promise<readonly ResultadoSonda[]>;
    private sondearMontadas;
    ejecutar(plan: MergePlan, entradas: readonly EntradaUnion[], onFraccion?: (fraccion: number) => void): Promise<Uint8Array>;
    private ejecutarMontadas;
    medirDuracion(blob: Blob): Promise<number | null>;
    cancelar(): void;
    dispose(): void;
    private crearWorker;
    private destruirWorker;
    private enviar;
    private montar;
    private desmontar;
    private clasificarFalloEjecucion;
}
