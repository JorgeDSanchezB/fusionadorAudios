/**
 * Formateo de cara al usuario (es-ES): tamaños y duraciones.
 * El locale llega como parámetro (nada hardcodeado en el sentido de negocio;
 * 'es' es el valor por defecto del idioma de la UI).
 */
const cacheFormateadores = new Map<string, Intl.NumberFormat>();

function formateadorNumeros(locale: string): Intl.NumberFormat {
  let f = cacheFormateadores.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    cacheFormateadores.set(locale, f);
  }
  return f;
}

/** Bytes → texto legible: 512 B, 4,5 KB, 350 MB, 1,2 GB. */
export function formatearBytes(bytes: number, locale = 'es'): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${formateadorNumeros(locale).format(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${formateadorNumeros(locale).format(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${formateadorNumeros(locale).format(mb)} MB`;
  return `${formateadorNumeros(locale).format(mb / 1024)} GB`;
}

/** Milisegundos → 0:07 · 3:05 · 1:02:03. `null` no se inventa (decide la UI). */
export function formatearDuracion(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return '—';
  const sTotales = Math.round(ms / 1000);
  const h = Math.floor(sTotales / 3600);
  const m = Math.floor((sTotales % 3600) / 60);
  const s = sTotales % 60;
  const dos = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${m}:${dos(s)}`;
}

/** Fracción 0..1 → «37%». */
export function formatearPorcentaje(fraccion: number, locale = 'es'): string {
  const v = Number.isFinite(fraccion) ? Math.min(1, Math.max(0, fraccion)) : 0;
  return `${formateadorNumeros(locale).format(Math.round(v * 100))}%`;
}

/** Fecha para el patrón del nombre de salida: AAAAMMDD-HHMM (local). */
export function marcaDeTiempo(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
