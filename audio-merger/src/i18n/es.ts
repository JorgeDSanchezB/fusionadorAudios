/**
 * i18n — castellano (idioma por defecto de UI y documentación).
 * TODOS los textos de interfaz viven aquí (D-07): ni el core ni el motor contienen
 * literales de usuario. Añadir un idioma = añadir un módulo y registrarlo en
 * i18n/index.ts sin tocar el núcleo.
 */
import type { MessageMap } from './types';

export const es: MessageMap = {
  // — App —
  'app.titulo': 'Fusionador de audio',
  'app.subtitulo': 'Todo se procesa en tu navegador: tus archivos no salen de tu dispositivo.',

  // — Zona de carga —
  'dropzone.titulo': 'Arrastra tus audios aquí',
  'dropzone.examinar': 'o pulsa para seleccionarlos',
  'dropzone.formatos': 'Formatos admitidos: {formatos}',
  'dropzone.max': 'Máximo {n} pistas',
  'dropzone.label': 'Añadir archivos de audio',

  // — Barra de herramientas —
  'toolbar.pista1': '{n} pista',
  'toolbar.pistas': '{n} pistas',
  'toolbar.duracion': 'Duración total: {duracion}',
  'toolbar.duracionDesconocida': 'Duración total: desconocida',
  'toolbar.tamano': 'Entrada: {tamano}',
  'toolbar.formato': 'Formato de salida',
  'toolbar.unir': 'Unir audios',
  'toolbar.unirAyuda': 'Añade al menos {n} pistas válidas para unir',
  'toolbar.cancelar': 'Cancelar',
  'toolbar.vaciar': 'Vaciar lista',

  // — Fila de pista —
  'pista.subir': 'Subir {nombre}',
  'pista.bajar': 'Bajar {nombre}',
  'pista.quitar': 'Quitar {nombre}',
  'pista.mango': 'Arrastrar para reordenar {nombre}',
  'pista.numero': 'Pista {n}',
  'pista.duracionDesconocida': 'duración desconocida',
  'pista.nombreVacio': '(sin nombre)',
  'pista.noUnible': 'No se puede unir',
  'pista.analizando': 'Leyendo metadatos…',

  // — Lista —
  'lista.label': 'Lista de pistas ordenable',
  'lista.vacia': 'Aún no hay pistas. Añade audios para empezar.',
  'lista.virtual': 'Lista larga: reordena con los botones ↑ y ↓ para mantener la fluidez.',

  // — Estados / progreso —
  'estado.motor': 'Descargando el motor de audio (unos 32 MB, solo la primera vez)… {pct}%',
  'estado.sonda': 'Analizando {conocidos} pistas…',
  'estado.uniendo': 'Uniendo… {pct}%',
  'estado.validando': 'Comprobando el resultado…',
  'estado.completado': 'Unión completada',
  'estado.cancelado': 'Unión cancelada',
  'estado.error': 'Error en la unión',
  'estado.progresoLabel': 'Progreso de la unión',

  // — Resultado —
  'resultado.titulo': '¡Listo! Tu audio unido',
  'resultado.descargar': 'Descargar',
  'resultado.otra': 'Hacer otra unión',
  'resultado.duracion': 'Duración',
  'resultado.tamano': 'Tamaño',
  'resultado.formato': 'Formato',
  'resultado.estrategiaCopia': 'copia exacta (rápido)',
  'resultado.estrategiaRecodificacion': 'convertido al formato elegido',
  'resultado.preescucha': 'Preescucha',
  'resultado.duracionDesconocida': 'desconocida',

  // — Diálogo de advertencia —
  'aviso.titulo': 'Unión grande',
  'aviso.cuerpo': 'La unión estimada pesa {tamano} y dura {duracion}. El proceso puede tardar y consumir mucha memoria. ¿Quieres continuar?',
  'aviso.duracionDesconocida': 'duración desconocida (podría ser mayor)',
  'aviso.continuar': 'Continuar',
  'aviso.cancelar': 'Cancelar',

  // — Errores: mensaje + consejo accionable por código —
  'error.UNSUPPORTED_FORMAT.mensaje': 'Formato no admitido: {formato}',
  'error.UNSUPPORTED_FORMAT.consejo': 'Los formatos admitidos son: {formatos}. Convierte el archivo a uno de ellos y vuelve a añadirlo.',
  'error.FILE_TOO_LARGE.mensaje': '«{nombre}» supera el límite de {limite}.',
  'error.FILE_TOO_LARGE.consejo': 'Quita el archivo o sustitúyelo por una versión más ligera.',
  'error.TOTAL_TOO_LARGE.mensaje': 'Entre todos los archivos se supera el límite total de {limite}.',
  'error.TOTAL_TOO_LARGE.consejo': 'Quita pistas hasta bajar del límite total.',
  'error.DURATION_TOO_LONG.mensaje': 'La duración total ({duracion}) supera el máximo configurado.',
  'error.DURATION_TOO_LONG.consejo': 'Quita pistas o amplía el límite de duración.',
  'error.OUT_OF_MEMORY.mensaje': 'El navegador se quedó sin memoria durante la unión.',
  'error.OUT_OF_MEMORY.consejo': 'Prueba con menos pistas, una salida más comprimida (MP3 en lugar de WAV) o cierra otras pestañas y reintenta.',
  'error.WASM_LOAD_FAILED.mensaje': 'No se pudo cargar el motor de audio.',
  'error.WASM_LOAD_FAILED.consejo': 'Revisa tu conexión y reintenta. Si sigue fallando, recarga la página.',
  'error.BROWSER_UNSUPPORTED.mensaje': 'Tu navegador es demasiado antiguo para esta herramienta.',
  'error.BROWSER_UNSUPPORTED.consejo': 'Actualiza a Chrome, Edge o Firefox ≥ 111, o Safari ≥ 16.4.',
  'error.USER_CANCELLED.mensaje': 'Cancelaste la unión.',
  'error.USER_CANCELLED.consejo': 'Puedes volver a empezar cuando quieras.',
  'error.INVALID_ORDER.mensaje': 'Reorden inválido.',
  'error.INVALID_ORDER.consejo': 'Los índices deben estar dentro de la lista actual.',
  'error.INVALID_OPTIONS.mensaje': 'Opciones inválidas: {detalle}',
  'error.INVALID_OPTIONS.consejo': 'Revisa el formato y la calidad elegidos.',
  'error.NOT_ENOUGH_TRACKS.mensaje': 'Se necesitan al menos {n} pistas válidas para unir.',
  'error.NOT_ENOUGH_TRACKS.consejo': 'Añade más audios válidos a la lista.',
  'error.TOO_MANY_TRACKS.mensaje': 'Se alcanzó el máximo de {n} pistas.',
  'error.TOO_MANY_TRACKS.consejo': 'Quita pistas de la lista para seguir.',
  'error.CORRUPT_FILE.mensaje': '«{nombre}» está dañado o no es un audio válido.',
  'error.CORRUPT_FILE.consejo': 'Vuelve a exportar el archivo o quítalo de la lista.',
  'error.CONFIG_INVALID.mensaje': 'Configuración inválida: {detalle}',
  'error.CONFIG_INVALID.consejo': 'Revisa la configuración de la herramienta (límites y URLs).',
  'error.JOB_IN_PROGRESS.mensaje': 'Ya hay una unión en curso.',
  'error.JOB_IN_PROGRESS.consejo': 'Espera a que termine o cancélala antes de empezar otra.',
  'error.WORKERFS_UNAVAILABLE.mensaje': 'El navegador no puede procesar tantos datos de golpe.',
  'error.WORKERFS_UNAVAILABLE.consejo': 'Une menos archivos a la vez o usa archivos más pequeños.',
  'error.PROBE_FAILED.mensaje': 'No se pudo analizar {nombres}.',
  'error.PROBE_FAILED.consejo': 'Comprueba que los archivos son audios válidos; quita los problemáticos e reintenta.',
  'error.UNKNOWN_ENGINE_ERROR.mensaje': 'Error inesperado del motor de audio.',
  'error.UNKNOWN_ENGINE_ERROR.consejo': 'Reintenta; si persiste, recarga la página.',

  // — Advertencias (no fatales, visibles) —
  'avisoCodigo.DURATION_MISMATCH': 'La duración del resultado ({obtenida}) no coincide con la esperada ({esperada}). Revisa el audio antes de usarlo.',
  'avisoCodigo.DURATION_ESTIMATED': 'La estimación se hizo con datos parciales: la duración real puede variar.',
  'avisoCodigo.ENGINE_RESTARTED': 'El motor se reinició tras la unión para liberar memoria (salida muy grande).',

  // — Etiquetas de formatos y opciones (los descriptores referencian claves, no texto) —
  'formato.mp3': 'MP3',
  'formato.wav': 'WAV',
  'formato.ogg': 'OGG',
  'formato.m4a': 'M4A',
  'formato.flac': 'FLAC',
  'formato.opus': 'OPUS',
  'salida.mp3': 'MP3 (compatible en todas partes)',
  'salida.wav': 'WAV (sin pérdida)',
  'opcion.bitrate': 'Calidad',
  'opcion.fade': 'Fundido entre pistas (ms)',

  // — Accesibilidad / anuncios —
  'a11y.anadidas': '{n} pistas añadidas',
  'a11y.quitada': 'Pista quitada: {nombre}',
  'a11y.movida': '«{nombre}» movida a la posición {pos}',
  'a11y.rechazada': 'Pista rechazada: {nombre} — {motivo}',

  // — Miscelánea —
  'misc.reintentar': 'Reintentar',
};
