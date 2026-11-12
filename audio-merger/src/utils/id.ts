/**
 * Identificadores estables (FASE 2): UUID por pista/job, JAMÁS el índice (Regla de
 * la Lista Infinita). `crypto.randomUUID` en navegadores soportados; fallback v4
 * con `Math.random` (unicidad suficiente; no criptográfico — declarado).
 */
export function crearId(): string {
  const c: Crypto | undefined = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback v4 (documentado: entornos sin crypto.randomUUID en contextos no seguros).
  const hex = (n: number): string => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  // Variante RFC 4122 forzada (4 en versión, 8/b en variante) aunque no sea criptográfico.
  return `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}
