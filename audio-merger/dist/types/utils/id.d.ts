/**
 * Identificadores estables (FASE 2): UUID por pista/job, JAMÁS el índice (Regla de
 * la Lista Infinita). `crypto.randomUUID` en navegadores soportados; fallback v4
 * con `Math.random` (unicidad suficiente; no criptográfico — declarado).
 */
export declare function crearId(): string;
