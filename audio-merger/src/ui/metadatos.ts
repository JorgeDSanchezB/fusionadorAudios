/**
 * Lectura de duración por metadatos del navegador (D-10, FASE 5):
 * un <audio> efímero parsea SOLO cabeceras (loadedmetadata), sin decodificar.
 * Si el navegador no declara duración (FLAC sin SEEKTABLE, OGG de flujo) o el
 * entorno no soporta object URLs: null declarado — la UI muestra «duración
 * desconocida», nunca una cifra inventada. NUNCA rechaza (la pista sigue unible).
 */

export function leerDuracion(blob: Blob): Promise<number | null> {
  return new Promise((resolver) => {
    const globales = globalThis as { URL?: { createObjectURL?: unknown } };
    if (typeof globales.URL?.createObjectURL !== 'function' || typeof document === 'undefined') {
      resolver(null); // entorno sin object URLs (jsdom/SSR): duración desconocida declarada
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    let resuelto = false;
    const terminar = (valor: number | null): void => {
      if (resuelto) return;
      resuelto = true;
      if (temporizador !== null) clearTimeout(temporizador);
      try {
        URL.revokeObjectURL(url);
        audio.removeAttribute('src');
      } catch {
        // limpieza best-effort
      }
      resolver(valor);
    };
    // Límite técnico: si el navegador no responde en 10 s, se declara desconocido.
    temporizador = setTimeout(() => terminar(null), 10_000);
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      // Infinity/NaN: contenedores de flujo → desconocido declarado.
      terminar(Number.isFinite(d) && d > 0 ? Math.round(d * 1000) : null);
    };
    audio.onerror = () => terminar(null);
    audio.src = url;
  });
}
