/**
 * Extensión de serie: FUNDIDO entre pistas (FASE 4 — demostración de la Regla del Carro).
 *
 * Este módulo AÑADE una opción (fadeMs) y un paso de post-proceso sin tocar el
 * núcleo (ni el orquestador ni las estrategias ni el motor saben que existe):
 * se registra en config/registry.ts y las estrategias lo aplican por contrato.
 *
 * Problema que resuelve: transiciones audibles entre pistas unidas.
 * Coste: fuerza re-codificación (no puede aplicar sobre `-c copy`).
 * Alternativa descartada: crossfade real (mezcla solapada) — exige `acrossfade`
 * encadenado por pista con buffers extra y cambia la duración total; queda como
 * extensión futura del MISMO registro.
 */
import { registrarOpcion, registrarPostProceso, type PlanEstructural } from '../config/registry';

const CLAVE = 'fadeMs';
/** Tope de seguridad del fundido por pista: la mitad de la pista (evita solapamientos). */
const TOPE_RELATIVO = 0.5;

const segundos = (ms: number): string => (ms / 1000).toFixed(3);

/** Registra la opción `fadeMs` y el post-proceso `fundido`. Llamar una sola vez. */
export function registrarFundido(): void {
  registrarOpcion({
    esquema: { key: CLAVE, type: 'int', min: 0, max: 10_000, default: 0 },
    etiquetaKey: 'opcion.fade',
  });

  registrarPostProceso({
    id: 'fundido',
    optionKey: CLAVE,
    requiereRecodificacion: true,
    aplica: (opciones) => Number(opciones[CLAVE] ?? 0) > 0,
    transformar: (plan: PlanEstructural, ctx) => {
      const ms = Math.max(0, Number(ctx.opciones[CLAVE] ?? 0));
      if (ms === 0 || plan.strategy !== 'reencode') return plan;

      const filtros = plan.rutasInternas.map((_, i) => {
        const cadena = [...(plan.filtros[i] ?? [])];
        const durMs = ctx.sonda[i]?.info.durationMs ?? null;
        if (durMs === null || durMs <= 0) {
          // Duración desconocida: solo fundido de entrada (no inventamos la posición de salida).
          cadena.push(`afade=t=in:st=0:d=${segundos(ms)}`);
          return cadena;
        }
        const durS = durMs / 1000;
        const d = Math.min(ms / 1000, durS * TOPE_RELATIVO);
        cadena.push(`afade=t=in:st=0:d=${segundos(d * 1000)}`);
        cadena.push(`afade=t=out:st=${segundos(Math.max(0, durS - d) * 1000)}:d=${segundos(d * 1000)}`);
        return cadena;
      });
      return { ...plan, filtros };
    },
  });
}
