/**
 * Virtualización por ventanas (D-06, FASE 5): propias, sin dependencias.
 * Se activa SOLO cuando n > umbral (config.virtualization.threshold). El contenedor
 * de lista recibe max-height + overflow-y (config.virtualization.alturaMaximaPx)
 * para que el SCROLL ocurra DENTRO de la lista y la ventana sea real: solo se
 * montan las filas visibles ± overscan sobre un espaciador de altura total.
 *
 * El DnD queda desactivado en modo virtual (los objetivos fuera de la ventana no
 * existen en el DOM); el reorden sigue COMPLETO por botones ↑/↓ y por API.
 */
export interface Ventana {
  /** Índice de la primera fila montada (incluido). */
  readonly inicio: number;
  /** Índice final (excluido): se montan las filas [inicio, fin). */
  readonly fin: number;
}

export interface ParametrosVentana {
  readonly total: number;
  readonly alturaFila: number;
  readonly overscan: number;
  readonly scrollTop: number;
  readonly alturaContenedor: number;
}

export function calcularVentana(p: ParametrosVentana): Ventana {
  const primera = Math.max(0, Math.floor(p.scrollTop / p.alturaFila));
  const visibles = Math.max(1, Math.ceil(p.alturaContenedor / p.alturaFila));
  const inicio = Math.max(0, primera - p.overscan);
  const fin = Math.min(p.total, primera + visibles + p.overscan);
  return { inicio, fin };
}
