/**
 * Código fuente del worker del motor (D-02/D-13).
 *
 * POR QUÉ UNA CADENA: el worker nace de una URL blob generada en runtime, idéntica
 * en las builds ESM y UMD. Así el bundle NO depende de cómo cada bundler resuelve
 * `new Worker(new URL(...))` (fallos conocidos de classWorkerURL en UMD) y no
 * empaquetamos @ffmpeg/ffmpeg: hablamos el protocolo del core directamente.
 *
 * El worker es CLÁSICO: `importScripts(coreURL)` con el core UMD oficial
 * (@ffmpeg/core). El core ST no requiere COOP/COEP; el MT se pasa por el truco
 * del fragmento `#` (wasmURL/workerURL) que usa el propio core (mismo mecanismo
 * que @ffmpeg/ffmpeg 0.12, verificado en sus fuentes).
 */
export const CODIGO_WORKER = String.raw`'use strict';
/* Motor ffmpeg.wasm — protocolo de mensajes de audio-merger (worker clásico). */
let nucleo = null;
let cargando = null;

const ok = (id, datos, transfer) => self.postMessage({ id: id, tipo: 'ok', datos: datos }, transfer || []);
const fallo = (id, mensaje) => self.postMessage({ id: id, tipo: 'error', datos: String(mensaje) });

async function cargar(config) {
  if (nucleo) return false;
  if (cargando) return cargando;
  cargando = (async () => {
    importScripts(config.coreURL);
    const crear = self.createFFmpegCore;
    if (typeof crear !== 'function') {
      throw new Error('createFFmpegCore no disponible tras importScripts (¿core corrupto o CSP?)');
    }
    nucleo = await crear({
      mainScriptUrlOrBlob: config.coreURL + '#' + btoa(JSON.stringify({
        wasmURL: config.wasmURL,
        workerURL: config.workerURL || ''
      }))
    });
    nucleo.setLogger(function (d) { self.postMessage({ tipo: 'log', datos: d }); });
    nucleo.setProgress(function (d) { self.postMessage({ tipo: 'progress', datos: d }); });
    try { nucleo.FS.mkdir('/output'); } catch (e) { /* EEXIST: ruta interna del protocolo, constante técnica declarada en D-13 */ }
    return true;
  })();
  try {
    return await cargando;
  } finally {
    cargando = null;
  }
}

function asegurar() {
  if (!nucleo) throw new Error('motor no cargado');
}

self.onmessage = async function (ev) {
  const m = ev.data;
  const id = m.id;
  try {
    if (m.tipo !== 'load') asegurar();
    switch (m.tipo) {
      case 'load': {
        ok(id, await cargar(m.datos));
        break;
      }
      case 'exec': {
        nucleo.setTimeout(m.datos.timeout);
        nucleo.exec.apply(nucleo, m.datos.args);
        const ret = nucleo.ret;
        nucleo.reset();
        ok(id, ret);
        break;
      }
      case 'mount': {
        const fs = nucleo.FS.filesystems[m.datos.fsType];
        if (!fs) { ok(id, { disponible: false }); break; }
        try { nucleo.FS.mkdir(m.datos.mountPoint); } catch (e) { /* EEXIST: ya existe */ }
        nucleo.FS.mount(fs, m.datos.options, m.datos.mountPoint);
        ok(id, { disponible: true });
        break;
      }
      case 'unmount': {
        try { nucleo.FS.unmount(m.datos.mountPoint); } catch (e) { /* ya desmontado */ }
        try { nucleo.FS.rmdir(m.datos.mountPoint); } catch (e) { /* sin entradas */ }
        ok(id, true);
        break;
      }
      case 'write': {
        nucleo.FS.writeFile(m.datos.ruta, m.datos.datos);
        ok(id, true);
        break;
      }
      case 'read': {
        const datos = nucleo.FS.readFile(m.datos.ruta);
        ok(id, datos, [datos.buffer]);
        break;
      }
      case 'delete': {
        try { nucleo.FS.unlink(m.datos.ruta); } catch (e) { /* inexistente */ }
        ok(id, true);
        break;
      }
      default:
        throw new Error('tipo de mensaje desconocido: ' + m.tipo);
    }
  } catch (e) {
    fallo(id, (e && e.message) ? e.message : e);
  }
};
`;
