var Xe = Object.defineProperty;
var et = (t, o, e) => o in t ? Xe(t, o, { enumerable: !0, configurable: !0, writable: !0, value: e }) : t[o] = e;
var y = (t, o, e) => et(t, typeof o != "symbol" ? o + "" : o, e);
const ia = [
  "UNSUPPORTED_FORMAT",
  // formato de entrada no registrado
  "FILE_TOO_LARGE",
  // un archivo supera limits.maxFileBytes
  "TOTAL_TOO_LARGE",
  // la suma de entradas supera limits.maxTotalBytes
  "DURATION_TOO_LONG",
  // Σ duraciones supera limits.maxDurationMs (si está fijado)
  "OUT_OF_MEMORY",
  // heurística por patrón de log del core (OOM/abort)
  "WASM_LOAD_FAILED",
  // red/CSP/archivo del core inaccesible o corrupto
  "BROWSER_UNSUPPORTED",
  // sin Worker/WASM: no hay degradación posible
  "USER_CANCELLED",
  // cancelación explícita (AbortSignal o botón)
  "INVALID_ORDER",
  // reorden inválido (índices fuera de rango, ids desconocidos)
  "INVALID_OPTIONS",
  // opciones de unión rechazadas por el validador
  "NOT_ENOUGH_TRACKS",
  // menos pistas válidas que limits.minTracks
  "TOO_MANY_TRACKS",
  // se superó limits.maxTracks al añadir
  "CORRUPT_FILE",
  // la sonda no pudo abrir el archivo (datos inválidos)
  "CONFIG_INVALID",
  // configuración global rechazada (atributos del componente)
  "JOB_IN_PROGRESS",
  // política de cola: ya hay un job activo
  "WORKERFS_UNAVAILABLE",
  // el core no registró WORKERFS (D-05)
  "PROBE_FAILED",
  // la sonda falló de forma no clasificable
  "UNKNOWN_ENGINE_ERROR"
  // error del motor sin clasificar (último recurso)
];
class m extends Error {
  constructor(e) {
    super(e.message);
    y(this, "code");
    y(this, "details");
    y(this, "cause");
    this.name = "MergeError", this.code = e.code, this.details = e.details ?? {}, this.cause = e.cause;
  }
  /** Serialización estable para eventos y logs (el `cause` no se serializa). */
  toJSON() {
    return { code: this.code, message: this.message, details: this.details };
  }
}
const tt = (t) => t instanceof m;
function C(t, o = "UNKNOWN_ENGINE_ERROR") {
  if (tt(t)) return t;
  const e = t instanceof Error ? `${t.name}: ${t.message}` : String(t);
  return t instanceof DOMException && t.name === "AbortError" ? new m({ code: "USER_CANCELLED", message: e, cause: t }) : /SecurityError[^\n]*(Worker|importScripts)|(Worker|importScripts)[^\n]*SecurityError|Failed to construct ['"]?Worker|importScripts/i.test(e) ? new m({ code: "WASM_LOAD_FAILED", message: e, details: { pista: "csp-worker" }, cause: t }) : /out of memory|memory alloc|abort\(OOM\)|RangeError.*allocation/i.test(e) ? new m({ code: "OUT_OF_MEMORY", message: e, cause: t }) : new m({ code: o, message: e, cause: t });
}
const sa = ["USER_CANCELLED", "JOB_IN_PROGRESS"], fe = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd", ee = "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd", Q = {
  limits: {
    minTracks: 2,
    maxTracks: 500,
    // 2 GB por archivo: las entradas se transmiten (WORKERFS), no se copian a RAM.
    maxFileBytes: 2 * 1024 * 1024 * 1024,
    // 8 GB en total: cota de sentido común para Σ entradas.
    maxTotalBytes: 8 * 1024 * 1024 * 1024,
    maxDurationMs: null,
    // sin límite duro de duración por defecto (solo aviso)
    // 350 MB: por debajo del techo práctico de salida en móvil (~400–500 MB),
    // para que el aviso llegue antes justo donde la memoria es más escasa (D-05).
    warnOutputBytes: 350 * 1024 * 1024,
    warnDurationMs: 7200 * 1e3
    // 2 h
  },
  virtualization: {
    threshold: 50,
    // el caso común documentado es ≤ 50 (D-06)
    rowHeightPx: 72,
    overscan: 4,
    maxHeightPx: 480
    // scroll interno cuando virtualiza; del tamaño de un viewport móvil
  },
  copyRule: {
    bitrateTolerancePct: 15
  },
  durationCheck: {
    toleranceMs: 2e3,
    tolerancePct: 2
  },
  engine: {
    mode: "auto",
    base: null,
    cdn: {
      coreJs: `${fe}/ffmpeg-core.js`,
      coreWasm: `${fe}/ffmpeg-core.wasm`,
      coreWorkerJs: `${ee}/ffmpeg-core.worker.js`,
      coreMtJs: `${ee}/ffmpeg-core.js`,
      coreMtWasm: `${ee}/ffmpeg-core.wasm`
    },
    restartAfterBytes: 1024 * 1024 * 1024,
    // 1 GB (D-05)
    progressWeights: { engineLoad: 0.05, probe: 0.1, merge: 0.8, validate: 0.05 }
  },
  i18n: {
    locale: "es"
  },
  outputNamePattern: "audio-unido-{fecha}.{ext}"
}, at = ["WASM_LOAD_FAILED", "UNKNOWN_ENGINE_ERROR", "PROBE_FAILED"];
function Ce(t, o) {
  if (!o || typeof o != "object") return t;
  const e = { ...t };
  for (const [a, r] of Object.entries(o)) {
    const i = t[a];
    e[a] = r && typeof r == "object" && !Array.isArray(r) && i && typeof i == "object" && !Array.isArray(i) ? Ce(i, r) : r;
  }
  return e;
}
function le(t, o, e = "") {
  if (!o || typeof o != "object" || Array.isArray(o)) return [];
  if (!t || typeof t != "object" || Array.isArray(t)) return [];
  const a = [];
  for (const [r, i] of Object.entries(o))
    Object.hasOwn(t, r) ? a.push(...le(t[r], i, `${e}${r}.`)) : a.push(`${e}${r}`);
  return a;
}
const ot = /^(https?:\/\/|\/)/i, rt = ["{ext}", "{n}", "{fecha}"];
function it(t) {
  const o = [], { limits: e, virtualization: a, copyRule: r, durationCheck: i, engine: s, i18n: c, outputNamePattern: d } = t, n = le(Q, t);
  n.length > 0 && o.push(`claves desconocidas: ${n.join(", ")}`), (!Number.isInteger(e.minTracks) || e.minTracks < 1) && o.push("limits.minTracks debe ser entero ≥ 1"), (!Number.isInteger(e.maxTracks) || e.maxTracks < e.minTracks) && o.push("limits.maxTracks debe ser ≥ limits.minTracks"), (!Number.isFinite(e.maxFileBytes) || e.maxFileBytes <= 0) && o.push("limits.maxFileBytes debe ser > 0"), (!Number.isFinite(e.maxTotalBytes) || e.maxTotalBytes < e.maxFileBytes) && o.push("limits.maxTotalBytes debe ser ≥ limits.maxFileBytes"), e.maxDurationMs !== null && (!Number.isFinite(e.maxDurationMs) || e.maxDurationMs <= 0) && o.push("limits.maxDurationMs debe ser > 0 o null"), (!Number.isFinite(e.warnOutputBytes) || e.warnOutputBytes <= 0) && o.push("limits.warnOutputBytes debe ser > 0"), (!Number.isFinite(e.warnDurationMs) || e.warnDurationMs <= 0) && o.push("limits.warnDurationMs debe ser > 0"), (!Number.isInteger(a.threshold) || a.threshold < 1) && o.push("virtualization.threshold debe ser entero ≥ 1"), (!Number.isFinite(a.rowHeightPx) || a.rowHeightPx < 8) && o.push("virtualization.rowHeightPx debe ser ≥ 8"), (!Number.isInteger(a.overscan) || a.overscan < 0) && o.push("virtualization.overscan debe ser entero ≥ 0"), (!Number.isFinite(a.maxHeightPx) || a.maxHeightPx < 120) && o.push("virtualization.maxHeightPx debe ser ≥ 120"), (!Number.isFinite(r.bitrateTolerancePct) || r.bitrateTolerancePct < 0 || r.bitrateTolerancePct > 100) && o.push("copyRule.bitrateTolerancePct debe estar en [0, 100]"), (!Number.isFinite(i.toleranceMs) || i.toleranceMs < 0) && o.push("durationCheck.toleranceMs debe ser ≥ 0"), (!Number.isFinite(i.tolerancePct) || i.tolerancePct < 0 || i.tolerancePct > 100) && o.push("durationCheck.tolerancePct debe estar en [0, 100]"), ["auto", "single", "multi"].includes(s.mode) || o.push("engine.mode debe ser auto|single|multi"), s.base !== null && !ot.test(s.base) && o.push('engine.base debe ser URL absoluta (http/https) o ruta absoluta ("/…")');
  for (const [f, h] of Object.entries(s.cdn))
    (typeof h != "string" || !/^https?:\/\//i.test(h)) && o.push(`engine.cdn.${f} debe ser URL http(s)`);
  (!Number.isFinite(s.restartAfterBytes) || s.restartAfterBytes <= 0) && o.push("engine.restartAfterBytes debe ser > 0");
  const l = s.progressWeights, p = l.engineLoad + l.probe + l.merge + l.validate;
  return (Object.values(l).some((f) => !Number.isFinite(f) || f < 0) || Math.abs(p - 1) > 1e-6) && o.push("engine.progressWeights: valores ≥ 0 y suma 1"), (typeof c.locale != "string" || c.locale.length === 0) && o.push("i18n.locale debe ser texto no vacío"), (typeof d != "string" || !d.includes("{ext}")) && o.push("outputNamePattern debe contener {ext}"), /\{[^}]*\}/.test(d.replace(/\{ext\}|\{n\}|\{fecha\}/g, "")) && o.push(`outputNamePattern solo admite variables ${rt.join(", ")}`), o;
}
function st(t) {
  const o = it(t);
  if (o.length > 0)
    throw new m({
      code: "CONFIG_INVALID",
      message: `Configuración inválida: ${o.join(" · ")}`,
      details: { problemas: o }
    });
}
function Te(t) {
  if (t && typeof t == "object" && !Object.isFrozen(t)) {
    Object.freeze(t);
    for (const o of Object.values(t)) o && typeof o == "object" && Te(o);
  }
  return t;
}
function nt(t) {
  return typeof structuredClone == "function" ? structuredClone(t) : JSON.parse(JSON.stringify(t));
}
function Me(t) {
  const o = t ? le(Q, t) : [];
  if (o.length > 0)
    throw new m({
      code: "CONFIG_INVALID",
      message: `Configuración con claves desconocidas: ${o.join(", ")}`,
      details: { desconocidas: o }
    });
  const e = nt(Q), a = t ? Ce(e, t) : e;
  return st(a), Te(a);
}
const se = [
  { nombre: "locale", tipo: "cadena", rutaConfig: "i18n.locale", claveOpcion: null },
  { nombre: "theme", tipo: "enum", valores: ["auto", "light", "dark"], rutaConfig: null, claveOpcion: null },
  { nombre: "headless", tipo: "booleano", rutaConfig: null, claveOpcion: null },
  { nombre: "format", tipo: "cadena", rutaConfig: null, claveOpcion: "format" },
  { nombre: "bitrate", tipo: "entero", rutaConfig: null, claveOpcion: "bitrateKbps", permiteVacio: !0 },
  { nombre: "fade-ms", tipo: "entero", rutaConfig: null, claveOpcion: "fadeMs" },
  { nombre: "engine-base", tipo: "cadena", rutaConfig: "engine.base", claveOpcion: null, permiteVacio: !0 },
  { nombre: "engine-mode", tipo: "enum", valores: ["auto", "single", "multi"], rutaConfig: "engine.mode", claveOpcion: null },
  { nombre: "min-tracks", tipo: "entero", rutaConfig: "limits.minTracks", claveOpcion: null },
  { nombre: "max-tracks", tipo: "entero", rutaConfig: "limits.maxTracks", claveOpcion: null },
  { nombre: "max-file-mb", tipo: "numero", rutaConfig: "limits.maxFileBytes", claveOpcion: null, escala: 1024 * 1024 },
  { nombre: "max-total-mb", tipo: "numero", rutaConfig: "limits.maxTotalBytes", claveOpcion: null, escala: 1024 * 1024 },
  { nombre: "warn-output-mb", tipo: "numero", rutaConfig: "limits.warnOutputBytes", claveOpcion: null, escala: 1024 * 1024 },
  { nombre: "max-duration-min", tipo: "numero", rutaConfig: "limits.maxDurationMs", claveOpcion: null, escala: 6e4, permiteVacio: !0 },
  { nombre: "virtualize-threshold", tipo: "entero", rutaConfig: "virtualization.threshold", claveOpcion: null },
  { nombre: "output-name", tipo: "cadena", rutaConfig: "outputNamePattern", claveOpcion: null }
];
function dt(t, o) {
  const e = se.find((r) => r.nombre === t);
  if (!e) return null;
  if (o === null || e.permiteVacio === !0 && o.trim() === "") {
    if (e.permiteVacio) return { descriptor: e, valor: null };
    throw new m({
      code: "CONFIG_INVALID",
      message: `el atributo «${t}» no puede estar vacío`,
      details: { atributo: t, tipo: e.tipo }
    });
  }
  const a = o.trim();
  switch (e.tipo) {
    case "cadena": {
      if (a.length === 0)
        throw new m({ code: "CONFIG_INVALID", message: `el atributo «${t}» está vacío`, details: { atributo: t } });
      return { descriptor: e, valor: a };
    }
    case "entero": {
      const r = Number(a);
      if (!Number.isInteger(r))
        throw new m({ code: "CONFIG_INVALID", message: `el atributo «${t}» debe ser un entero (recibido: «${o}»)`, details: { atributo: t, recibido: o } });
      return { descriptor: e, valor: e.escala ? r * e.escala : r };
    }
    case "numero": {
      const r = Number(a);
      if (!Number.isFinite(r))
        throw new m({ code: "CONFIG_INVALID", message: `el atributo «${t}» debe ser un número (recibido: «${o}»)`, details: { atributo: t, recibido: o } });
      return { descriptor: e, valor: e.escala ? r * e.escala : r };
    }
    case "booleano": {
      const r = a.toLowerCase();
      if (a === "" || ["true", "1", "yes", "si", "sí"].includes(r))
        return { descriptor: e, valor: !0 };
      if (["false", "0", "no"].includes(r))
        return { descriptor: e, valor: !1 };
      throw new m({ code: "CONFIG_INVALID", message: `el atributo «${t}» debe ser booleano (recibido: «${o}»)`, details: { atributo: t, recibido: o } });
    }
    case "enum": {
      if (!e.valores?.includes(a))
        throw new m({
          code: "CONFIG_INVALID",
          message: `el atributo «${t}» debe ser uno de: ${e.valores?.join(", ") ?? "—"} (recibido: «${o}»)`,
          details: { atributo: t, recibido: o, permitidos: e.valores ?? [] }
        });
      return { descriptor: e, valor: a };
    }
  }
}
function ct(t) {
  if (t.descriptor.rutaConfig === null) return null;
  const o = t.descriptor.rutaConfig.split("."), e = {};
  let a = e;
  for (let r = 0; r < o.length; r++) {
    const i = o[r];
    r === o.length - 1 ? a[i] = t.valor : (a[i] = {}, a = a[i]);
  }
  return e;
}
function lt(t) {
  const o = {}, e = {}, a = {};
  for (const [r, i] of Object.entries(t)) {
    if (i === null) continue;
    const s = dt(r, i);
    if (s)
      if (s.descriptor.claveOpcion)
        e[s.descriptor.claveOpcion] = s.valor;
      else if (s.descriptor.rutaConfig) {
        const c = ct(s);
        c && Se(o, c);
      } else
        a[s.descriptor.nombre] = s.valor;
  }
  return { overridesConfig: o, opciones: e, estructural: a };
}
function Se(t, o) {
  for (const [e, a] of Object.entries(o))
    a && typeof a == "object" && t[e] && typeof t[e] == "object" ? Se(t[e], a) : t[e] = a;
}
const O = {
  pistaAnadida: "audiomerger:track-added",
  pistaQuitada: "audiomerger:track-removed",
  reordenado: "audiomerger:reordered",
  unionIniciada: "audiomerger:merge-started",
  progresoUnion: "audiomerger:merge-progress",
  unionCompletada: "audiomerger:merge-completed",
  error: "audiomerger:error",
  cancelada: "audiomerger:cancelled",
  opcionesCambiadas: "audiomerger:options-changed"
}, ut = (t) => typeof t == "number" && Number.isFinite(t) && Number.isInteger(t), mt = (t) => typeof t == "number" && Number.isFinite(t);
function pt(t, o) {
  const e = [];
  for (const [a, r] of Object.entries(t)) {
    const i = o.find((s) => s.key === a);
    if (!i) {
      e.push({ key: a, esperado: "una opción registrada", recibido: r });
      continue;
    }
    if (r === null) {
      i.nullable || e.push({ key: a, esperado: `${i.type} no nulo`, recibido: r });
      continue;
    }
    switch (i.type) {
      case "int": {
        if (!ut(r)) {
          e.push({ key: a, esperado: "entero", recibido: r });
          break;
        }
        i.min !== void 0 && r < i.min && e.push({ key: a, esperado: `≥ ${i.min}`, recibido: r }), i.max !== void 0 && r > i.max && e.push({ key: a, esperado: `≤ ${i.max}`, recibido: r });
        break;
      }
      case "number": {
        if (!mt(r)) {
          e.push({ key: a, esperado: "número", recibido: r });
          break;
        }
        i.min !== void 0 && r < i.min && e.push({ key: a, esperado: `≥ ${i.min}`, recibido: r }), i.max !== void 0 && r > i.max && e.push({ key: a, esperado: `≤ ${i.max}`, recibido: r });
        break;
      }
      case "enum": {
        if (typeof r != "string") {
          e.push({ key: a, esperado: "una de las opciones", recibido: r });
          break;
        }
        const s = typeof i.values == "function" ? i.values(t) : i.values ?? [];
        s.includes(r) || e.push({ key: a, esperado: `uno de: ${s.join(", ")}`, recibido: r });
        break;
      }
      case "bool": {
        typeof r != "boolean" && e.push({ key: a, esperado: "booleano", recibido: r });
        break;
      }
      case "string": {
        (typeof r != "string" || r.length === 0) && e.push({ key: a, esperado: "texto no vacío", recibido: r });
        break;
      }
    }
  }
  return e;
}
function ft(t, o) {
  const e = { ...t };
  for (const a of o)
    !(a.key in e) && a.default !== void 0 && (e[a.key] = a.default);
  return e;
}
function ht(t) {
  return new Set(t).size === t.length;
}
function De(t, o) {
  return ht(t) && t.every((e) => o.has(e));
}
function gt(t, o, e) {
  return Number.isInteger(o) && Number.isInteger(e) && o >= 0 && e >= 0 && o < t && e < t;
}
function ue(t) {
  const o = t.lastIndexOf(".");
  return o > 0 ? t.slice(o + 1).toLowerCase() : "";
}
function $e(t) {
  const o = ue(t);
  return o !== "" && /^[a-z0-9]{1,8}$/.test(o) ? o : "bin";
}
function bt(t, o, e) {
  const a = ue(t.name), r = (t.type || "").toLowerCase();
  return o.some(
    (s) => a !== "" && s.extensions.includes(a) || r !== "" && s.mimeTypes.includes(r)
  ) ? t.size > e.maxFileBytes ? new m({
    code: "FILE_TOO_LARGE",
    message: `${t.name}: ${t.size} B supera el máximo ${e.maxFileBytes} B`,
    details: { nombre: t.name, tamano: t.size, maximo: e.maxFileBytes }
  }) : null : new m({
    code: "UNSUPPORTED_FORMAT",
    message: `formato no registrado: ${t.name || "(sin nombre)"} [${a || "sin extensión"}${r ? `; ${r}` : ""}]`,
    details: { nombre: t.name, extension: a, mimeType: r }
  });
}
function vt(t, o, e) {
  const a = [], r = [], i = o.length, s = o.reduce((n, l) => n + l.size, 0);
  let c = i, d = s;
  for (const n of t) {
    if (c >= e.maxTracks) {
      r.push({
        pista: n,
        error: new m({
          code: "TOO_MANY_TRACKS",
          message: `límite de pistas alcanzado (${e.maxTracks})`,
          details: { maximo: e.maxTracks }
        })
      });
      continue;
    }
    if (d + n.size > e.maxTotalBytes) {
      r.push({
        pista: n,
        error: new m({
          code: "TOTAL_TOO_LARGE",
          message: `«${n.name}» desborda el tamaño total (${d + n.size} B > ${e.maxTotalBytes} B)`,
          details: { nombre: n.name, total: d + n.size, maximo: e.maxTotalBytes }
        })
      });
      continue;
    }
    a.push(n), c += 1, d += n.size;
  }
  return { admitidas: a, rechazadas: r };
}
function he(t) {
  let o = 0, e = 0;
  for (const a of t)
    o += a.size, a.durationMs === null ? e = null : e !== null && (e += a.durationMs);
  return { duracionMs: e, bytes: o };
}
function ke(t, o, e) {
  const a = t.length;
  if (!gt(a, o, e))
    throw new m({
      code: "INVALID_ORDER",
      message: `reorden inválido ${o}→${e} en lista de ${a}`,
      details: { de: o, a: e, n: a }
    });
  const r = [...t], [i] = r.splice(o, 1);
  if (i === void 0)
    throw new m({ code: "INVALID_ORDER", message: `elemento inexistente en ${o}`, details: { de: o, a: e } });
  return r.splice(e, 0, i), r;
}
function yt(t, o, e) {
  const a = t.indexOf(o);
  if (a < 0)
    throw new m({ code: "INVALID_ORDER", message: `id desconocido: ${o}`, details: { id: o } });
  const r = a + e;
  return ke(t, a, r);
}
function xt(t, o, e) {
  return o.length === t.length && De(o, e) && t.every((a) => o.includes(a));
}
function ze(t, o) {
  return Number.isFinite(t) ? t < o.minTracks ? new m({
    code: "NOT_ENOUGH_TRACKS",
    message: `${t} pista(s) válida(s) < mínimo ${o.minTracks}`,
    details: { obtenidas: t, minimo: o.minTracks }
  }) : null : new m({ code: "NOT_ENOUGH_TRACKS", message: `número de pistas no finito: ${t}`, details: { obtenidas: t, minimo: o.minTracks } });
}
function ge(t, o, e) {
  let a = 0, r = !1, i = 0;
  for (const d of t)
    i += d.size, d.durationMs === null ? r = !0 : a += d.durationMs;
  const s = r ? a > 0 ? a : null : a;
  return o === "copy" ? { bytes: i > 0 ? Math.round(i * 1.01) : null, duracionMs: s, parcial: r } : s === null || e === null || e <= 0 ? { bytes: null, duracionMs: s, parcial: !0 } : { bytes: Math.round(s / 1e3 * e * 1.03), duracionMs: s, parcial: r };
}
function Et(t, o) {
  const e = [];
  return t.bytes !== null && t.bytes >= o.warnOutputBytes && e.push({ tipo: "tamano", mensajeTecnico: `salida estimada ≥ ${o.warnOutputBytes} B` }), o.warnDurationMs !== null && t.duracionMs !== null && t.duracionMs >= o.warnDurationMs && e.push({ tipo: "duracion", mensajeTecnico: `duración ≥ ${o.warnDurationMs} ms` }), e;
}
function wt(t, o) {
  const e = [], a = t.reduce((r, i) => r + i.size, 0);
  if (a > o.maxTotalBytes && e.push(new m({
    code: "TOTAL_TOO_LARGE",
    message: `Σ entradas ${a} B > máximo ${o.maxTotalBytes} B`,
    details: { total: a, maximo: o.maxTotalBytes }
  })), o.maxDurationMs !== null) {
    const r = t.map((i) => i.durationMs);
    if (r.every((i) => i !== null)) {
      const i = r.reduce((s, c) => s + (c ?? 0), 0);
      i > o.maxDurationMs && e.push(new m({
        code: "DURATION_TOO_LONG",
        message: `Σ duraciones ${i} ms > máximo ${o.maxDurationMs} ms`,
        details: { total: i, maximo: o.maxDurationMs }
      }));
    }
  }
  return e;
}
const be = /* @__PURE__ */ new Map();
function F(t) {
  let o = be.get(t);
  return o || (o = new Intl.NumberFormat(t, { maximumFractionDigits: 1 }), be.set(t, o)), o;
}
function D(t, o = "es") {
  if (!Number.isFinite(t) || t < 0) return "—";
  if (t < 1024) return `${F(o).format(t)} B`;
  const e = t / 1024;
  if (e < 1024) return `${F(o).format(e)} KB`;
  const a = e / 1024;
  return a < 1024 ? `${F(o).format(a)} MB` : `${F(o).format(a / 1024)} GB`;
}
function $(t) {
  if (t === null || !Number.isFinite(t) || t < 0) return "—";
  const o = Math.round(t / 1e3), e = Math.floor(o / 3600), a = Math.floor(o % 3600 / 60), r = o % 60, i = (s) => String(s).padStart(2, "0");
  return e > 0 ? `${e}:${i(a)}:${i(r)}` : `${a}:${i(r)}`;
}
function te(t, o = "es") {
  const e = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  return `${F(o).format(Math.round(e * 100))}%`;
}
function Ot(t = /* @__PURE__ */ new Date()) {
  const o = (e) => String(e).padStart(2, "0");
  return `${t.getFullYear()}${o(t.getMonth() + 1)}${o(t.getDate())}-${o(t.getHours())}${o(t.getMinutes())}`;
}
function Rt(t, o, e) {
  return t.outputNamePattern.replaceAll("{ext}", o.outputExtension).replaceAll("{n}", String(e)).replaceAll("{fecha}", Ot());
}
async function je(t, o, e) {
  const { config: a, motor: r, planificador: i, validadorContenedor: s, esquemasOpciones: c, signal: d, onProgress: n } = e, l = a.engine.progressWeights, p = (g, _, z) => {
    const w = Math.min(1, Math.max(0, _));
    if (!(w < f)) {
      f = w;
      try {
        n?.({ stage: g, progress: w, detail: z });
      } catch {
      }
    }
  };
  let f = 0;
  const h = () => {
    if (d?.aborted) throw new m({ code: "USER_CANCELLED", message: "unión cancelada antes de continuar" });
  }, v = pt(o, c);
  if (v.length > 0)
    throw new m({
      code: "INVALID_OPTIONS",
      message: v.map((g) => `${g.key}: se esperaba ${g.esperado}, se recibió ${JSON.stringify(g.recibido)}`).join("; "),
      details: { issues: v }
    });
  const E = ft(o, c);
  h();
  const R = ze(t.length, a.limits);
  if (R) throw R;
  const b = t.find((g) => g.blob.size > a.limits.maxFileBytes);
  if (b)
    throw new m({
      code: "FILE_TOO_LARGE",
      message: `${b.name}: ${b.blob.size} B supera el máximo ${a.limits.maxFileBytes} B`,
      details: { nombre: b.name, tamano: b.blob.size, maximo: a.limits.maxFileBytes }
    });
  const T = wt(t.map((g) => ({ name: g.name, size: g.blob.size, durationMs: null })), a.limits);
  if (T.length > 0) throw T[0];
  p("loading-engine", 0);
  const N = () => {
    r.cancelar();
  };
  d?.addEventListener("abort", N, { once: !0 });
  try {
    await r.ensureLoaded((g) => p("loading-engine", g * l.engineLoad));
  } catch (g) {
    throw d?.aborted ? new m({ code: "USER_CANCELLED", message: "unión cancelada durante la carga del motor" }) : C(g, "WASM_LOAD_FAILED");
  } finally {
    d?.removeEventListener("abort", N);
  }
  p("loading-engine", l.engineLoad), h(), p("probing", l.engineLoad);
  let G;
  d?.addEventListener("abort", N, { once: !0 });
  try {
    G = await r.sondear(t);
  } catch (g) {
    throw d?.aborted ? new m({ code: "USER_CANCELLED", message: "unión cancelada durante la sonda" }) : C(g, "PROBE_FAILED");
  } finally {
    d?.removeEventListener("abort", N);
  }
  p("probing", l.engineLoad + l.probe);
  const Ze = new Set(t.map((g) => g.id)), k = G.map((g) => g.id);
  if (k.length !== t.length || new Set(k).size !== k.length || k.some((g) => !Ze.has(g)))
    throw new m({
      code: "PROBE_FAILED",
      message: `la sonda devolvió ${k.length} resultados para ${t.length} entradas`,
      details: { esperados: t.length, recibidos: k.length }
    });
  const M = G.filter((g) => "error" in g);
  if (M.length > 0) {
    const g = M.filter((w) => w.error.code === "CORRUPT_FILE"), _ = g.length > 0 ? g[0].error : M[0].error, z = new Map(t.map((w) => [w.id, w.name]));
    throw new m({
      code: _.code,
      message: `${_.message} [pistas: ${M.map((w) => z.get(w.id) ?? w.id).join(", ")}]`,
      details: {
        ids: M.map((w) => w.id),
        nombres: M.map((w) => z.get(w.id) ?? w.id),
        causas: M.map((w) => w.error.code)
      }
    });
  }
  const pe = G.map((g) => ({ id: g.id, info: g.info }));
  if (a.limits.maxDurationMs !== null) {
    const g = pe.map((_) => _.info.durationMs);
    if (g.every((_) => _ !== null)) {
      const _ = g.reduce((z, w) => z + (w ?? 0), 0);
      if (_ > a.limits.maxDurationMs)
        throw new m({
          code: "DURATION_TOO_LONG",
          message: `Σ duraciones ${_} ms > máximo ${a.limits.maxDurationMs} ms`,
          details: { total: _, maximo: a.limits.maxDurationMs }
        });
    }
  }
  h();
  const A = i(pe, t, E, a);
  p("merging", l.engineLoad + l.probe);
  let L;
  d?.addEventListener("abort", N, { once: !0 });
  try {
    L = await r.ejecutar(A, t, (g) => p("merging", l.engineLoad + l.probe + g * l.merge));
  } catch (g) {
    throw d?.aborted ? new m({ code: "USER_CANCELLED", message: "unión cancelada durante la ejecución" }) : C(g);
  } finally {
    d?.removeEventListener("abort", N);
  }
  if (p("merging", l.engineLoad + l.probe + l.merge), h(), p("validating", l.engineLoad + l.probe + l.merge), L.length === 0 || !s(L, E.format))
    throw new m({
      code: "UNKNOWN_ENGINE_ERROR",
      message: `la salida no es un contenedor ${A.outputExtension} válido (${L.length} B)`,
      details: { formato: E.format, bytes: L.length }
    });
  let S = null;
  d?.addEventListener("abort", N, { once: !0 });
  try {
    S = await r.medirDuracion(new Blob([L], { type: A.outputMimeType }));
  } catch {
    S = null;
  } finally {
    d?.removeEventListener("abort", N);
  }
  h();
  const X = [];
  if (A.expectedDurationMs !== null && S !== null) {
    const g = Math.max(
      a.durationCheck.toleranceMs,
      A.expectedDurationMs * (a.durationCheck.tolerancePct / 100)
    );
    Math.abs(S - A.expectedDurationMs) > g && X.push({
      code: "DURATION_MISMATCH",
      message: `duración obtenida ${Math.round(S)} ms ≠ esperada ${A.expectedDurationMs} ms (tolerancia ${Math.round(g)} ms)`,
      params: {
        obtenida: $(S),
        esperada: $(A.expectedDurationMs)
      }
    });
  }
  return p("validating", 1), L.byteLength > a.engine.restartAfterBytes && (r.dispose(), X.push({
    code: "ENGINE_RESTARTED",
    message: `salida de ${D(L.byteLength)}: motor reiniciado para liberar memoria`
  })), {
    blob: new Blob([L], { type: A.outputMimeType }),
    name: Rt(a, A, t.length),
    mimeType: A.outputMimeType,
    size: L.byteLength,
    durationMs: S,
    strategy: A.strategy,
    warnings: X
  };
}
const U = (t, o, e) => String.fromCharCode(...Array.from(t.slice(o, e)));
function Ue(t) {
  if (t.length < 4) return !1;
  if (U(t, 0, 3) === "ID3") return !0;
  const o = t[1] >> 3 & 3, e = t[1] >> 1 & 3;
  return t[0] === 255 && (t[1] & 224) === 224 && o !== 1 && e !== 0;
}
function Pe(t) {
  return t.length < 12 ? !1 : U(t, 0, 4) === "RIFF" && U(t, 8, 12) === "WAVE";
}
function At(t) {
  return t.length < 4 ? !1 : U(t, 0, 4) === "OggS";
}
function _t(t) {
  return t.length < 4 ? !1 : U(t, 0, 4) === "fLaC";
}
function Lt(t) {
  return t.length < 8 ? !1 : U(t, 4, 8) === "ftyp";
}
const na = {
  mp3: Ue,
  wav: Pe,
  ogg: At,
  flac: _t,
  m4a: Lt
}, B = /* @__PURE__ */ new Map();
function P(t) {
  if (Ve(t.id, "formato de entrada"), B.has(t.id))
    throw new m({ code: "CONFIG_INVALID", message: `formato de entrada ya registrado: ${t.id}`, details: { id: t.id } });
  if (!t.extensions?.length && !t.mimeTypes?.length)
    throw new m({ code: "CONFIG_INVALID", message: `formato «${t.id}» sin extensiones ni MIME types`, details: { id: t.id } });
  if (!/^[a-z0-9]{1,12}$/.test(t.id) || t.extensions.some((o) => !/^[a-z0-9]{1,8}$/.test(o)))
    throw new m({ code: "CONFIG_INVALID", message: `ids/extensiones deben ser [a-z0-9] (recibido: ${t.id} / ${t.extensions.join(",")})`, details: { id: t.id } });
  B.set(t.id, Object.freeze({ ...t, extensions: [...t.extensions], mimeTypes: [...t.mimeTypes] }));
}
function K() {
  return [...B.values()];
}
function Fe(t, o) {
  const e = t.lastIndexOf("."), a = e > 0 ? t.slice(e + 1).toLowerCase() : "", r = (o || "").toLowerCase();
  for (const i of B.values())
    if (a !== "" && i.extensions.includes(a) || r !== "" && i.mimeTypes.includes(r)) return i;
  return null;
}
const q = /* @__PURE__ */ new Map();
function ve(t) {
  if (Ve(t.id, "formato de salida"), q.has(t.id))
    throw new m({ code: "CONFIG_INVALID", message: `formato de salida ya registrado: ${t.id}`, details: { id: t.id } });
  if (!t.argsCodificacion || typeof t.argsCodificacion != "function")
    throw new m({ code: "CONFIG_INVALID", message: `formato de salida «${t.id}» sin argsCodificacion`, details: { id: t.id } });
  if (t.bitratesKbps !== null && t.bitratePorDefecto === null)
    throw new m({ code: "CONFIG_INVALID", message: `formato «${t.id}» con bitrates pero sin bitratePorDefecto`, details: { id: t.id } });
  q.set(t.id, Object.freeze({ ...t }));
}
function Z() {
  return [...q.values()];
}
function j(t) {
  return q.get(t) ?? null;
}
const V = /* @__PURE__ */ new Map();
function ne(t) {
  const o = t.esquema.key;
  if (We(o, "opción"), V.has(o))
    throw new m({ code: "CONFIG_INVALID", message: `opción ya registrada: ${o}`, details: { clave: o } });
  V.set(o, Object.freeze({ ...t, esquema: Object.freeze({ ...t.esquema }) }));
}
function Be() {
  return [...V.values()].map((t) => t.esquema);
}
const W = /* @__PURE__ */ new Map();
function It(t) {
  if (We(t.id, "post-proceso"), W.has(t.id))
    throw new m({ code: "CONFIG_INVALID", message: `post-proceso ya registrado: ${t.id}`, details: { id: t.id } });
  if (!V.has(t.optionKey))
    throw new m({
      code: "CONFIG_INVALID",
      message: `post-proceso «${t.id}» referencia una opción no registrada: ${t.optionKey}`,
      details: { id: t.id, optionKey: t.optionKey }
    });
  W.set(t.id, Object.freeze({ ...t }));
}
function qe(t) {
  return [...W.values()].filter((o) => o.aplica(t));
}
function da() {
  return [...W.values()];
}
function Ve(t, o) {
  if (typeof t != "string" || !/^[a-z0-9]{1,12}$/.test(t))
    throw new m({ code: "CONFIG_INVALID", message: `id de ${o} inválido: «${String(t)}» (se espera [a-z0-9]{1,12})`, details: { id: t } });
}
function We(t, o) {
  if (typeof t != "string" || !/^[a-z][a-zA-Z0-9]{1,31}$/.test(t))
    throw new m({ code: "CONFIG_INVALID", message: `id de ${o} inválido: «${String(t)}» (se espera camelCase)`, details: { id: t } });
}
function Ge(t, o, e) {
  const a = String(Math.max(1, e)).length;
  return `p${String(t + 1).padStart(a, "0")}.${o}`;
}
function ca() {
  B.clear(), q.clear(), V.clear(), W.clear();
}
const Ke = "/input", me = "/output", Nt = `${me}/list.txt`;
function Ct(t, o, e, a) {
  if (t.length === 0 || qe(e).some((d) => d.requiereRecodificacion)) return !1;
  const r = t[0].codec;
  if (!o.codecsNativosParaCopia.includes(r)) return !1;
  const i = t[0].sampleRateHz, s = t[0].channels;
  if (i <= 0 || s <= 0) return !1;
  for (const d of t)
    if (d.codec !== r || d.sampleRateHz !== i || d.channels !== s || d.sampleRateHz <= 0 || d.channels <= 0) return !1;
  const c = t.map((d) => d.bitrateKbps).filter((d) => d !== null);
  if (c.length === t.length && c.length > 1) {
    const d = Math.min(...c), n = Math.max(...c), l = a.copyRule.bitrateTolerancePct / 100;
    if (n - d > n * l) return !1;
  }
  return !0;
}
function Tt(t, o) {
  const e = t.bitrateKbps ?? o.bitratePorDefecto;
  if (o.bitratesKbps === null) {
    if (e !== null)
      throw new m({
        code: "INVALID_OPTIONS",
        message: `el formato «${o.id}» no usa bitrate (recibido: ${e})`,
        details: { formato: o.id, bitrate: e }
      });
    return null;
  }
  if (e === null || !o.bitratesKbps.includes(e))
    throw new m({
      code: "INVALID_OPTIONS",
      message: `bitrate ${String(e)} no disponible para «${o.id}» (válidos: ${o.bitratesKbps.join(", ")})`,
      details: { formato: o.id, bitrate: e, validos: [...o.bitratesKbps] }
    });
  return e;
}
const Mt = (t) => t === 1 ? "mono" : "stereo";
function St(t, o) {
  const e = ["-hide_banner", "-nostdin", "-y"];
  if (t.strategy === "copy")
    return [...e, "-f", "concat", "-safe", "0", "-i", Nt, "-map", "0:a", "-map_metadata", "-1", "-c", "copy", t.rutaSalida];
  const a = t.rutasInternas.flatMap((c) => ["-i", c]), r = t.rutasInternas.map((c, d) => `[a${d}]`), s = `${t.filtros.map((c, d) => `[${d}:a]${c.join(",")}[a${d}]`).join(";")};${r.join("")}concat=n=${t.rutasInternas.length}:v=0:a=1[out]`;
  return [...e, ...a, "-filter_complex", s, "-map", "[out]", "-map_metadata", "-1", ...t.argsSalida, t.rutaSalida];
}
const He = (t, o, e, a) => {
  const r = j(e.format);
  if (!r)
    throw new m({
      code: "INVALID_OPTIONS",
      message: `formato de salida no registrado: ${e.format}`,
      details: { formato: e.format }
    });
  const i = Tt(e, r), s = o.length, c = o.map((b) => $e(b.name)), d = o.map((b, T) => `${Ke}/${Ge(T, c[T], s)}`), n = t.map((b) => b.info), l = e, p = Ct(n, r, l, a), f = `${me}/salida.${r.extension}`;
  let h;
  if (p)
    h = {
      strategy: "copy",
      rutasInternas: d,
      filtros: d.map(() => []),
      listaConcat: d.map((b) => `file '${b}'`),
      argsSalida: ["-c", "copy"],
      rutaSalida: f,
      salidaMimeType: r.mimeType,
      salidaExtension: r.extension
    };
  else {
    const b = `aformat=sample_rates=${r.sampleRateHz}:channel_layouts=${Mt(r.canales)}`;
    h = {
      strategy: "reencode",
      rutasInternas: d,
      filtros: d.map(() => [b]),
      listaConcat: null,
      argsSalida: [...r.argsCodificacion(i)],
      rutaSalida: f,
      salidaMimeType: r.mimeType,
      salidaExtension: r.extension
    };
  }
  const v = qe(l);
  for (const b of v)
    if (h = b.transformar(h, { sonda: t, opciones: l, config: a }), b.requiereRecodificacion && h.strategy !== "reencode")
      throw new m({
        code: "CONFIG_INVALID",
        message: `el post-proceso «${b.id}» exige re-codificación pero el plan quedó en copia`,
        details: { postProceso: b.id }
      });
  const E = n.map((b) => b.durationMs), R = E.every((b) => b !== null) ? E.reduce((b, T) => b + (T ?? 0), 0) : null;
  return {
    strategy: h.strategy,
    args: St(h),
    outputInternalName: h.rutaSalida,
    listaConcat: h.listaConcat ?? void 0,
    outputMimeType: h.salidaMimeType,
    outputExtension: h.salidaExtension,
    expectedDurationMs: R
  };
}, Dt = String.raw`'use strict';
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
`, ye = { js: "core/ffmpeg-core.js", wasm: "core/ffmpeg-core.wasm" }, ae = { js: "core-mt/ffmpeg-core.js", wasm: "core-mt/ffmpeg-core.wasm", worker: "core-mt/ffmpeg-core.worker.js" };
function xe(t) {
  if (t.startsWith("/")) return !0;
  try {
    return new URL(t, globalThis.location.href).origin === globalThis.location.origin;
  } catch {
    return !1;
  }
}
function $t() {
  const t = globalThis;
  return typeof t.Worker > "u" || typeof t.WebAssembly > "u" || typeof t.fetch > "u" ? new m({
    code: "BROWSER_UNSUPPORTED",
    message: "el navegador no soporta Worker/WebAssembly/fetch",
    details: { worker: typeof t.Worker < "u", wasm: typeof t.WebAssembly < "u", fetch: typeof t.fetch < "u" }
  }) : null;
}
function kt(t) {
  const o = (i) => !i.startsWith("/") || typeof globalThis.location > "u" ? i : new URL(i, globalThis.location.href).href, e = t.engine.mode === "multi" ? "multi" : t.engine.mode === "single" ? "single" : globalThis.crossOriginIsolated === !0 ? "multi" : "single", a = t.engine.base;
  if (a) {
    const i = a.endsWith("/") ? a : `${a}/`;
    return e === "multi" ? {
      coreURL: o(`${i}${ae.js}`),
      wasmURL: o(`${i}${ae.wasm}`),
      workerURL: o(`${i}${ae.worker}`),
      esMismoOrigen: xe(i)
    } : {
      coreURL: o(`${i}${ye.js}`),
      wasmURL: o(`${i}${ye.wasm}`),
      workerURL: null,
      esMismoOrigen: xe(i)
    };
  }
  const r = t.engine.cdn;
  return e === "multi" ? { coreURL: r.coreMtJs, wasmURL: r.coreMtWasm, workerURL: r.coreWorkerJs, esMismoOrigen: !1 } : { coreURL: r.coreJs, wasmURL: r.coreWasm, workerURL: null, esMismoOrigen: !1 };
}
let oe = null;
function zt() {
  if (oe === null) {
    const t = new Blob([Dt], { type: "text/javascript" });
    oe = URL.createObjectURL(t);
  }
  return oe;
}
async function re(t, o, e) {
  const a = await fetch(t);
  if (!a.ok)
    throw new m({
      code: "WASM_LOAD_FAILED",
      message: `descarga fallida ${a.status} ${a.statusText} de ${t}`,
      details: { url: t, estado: a.status }
    });
  const r = Number(a.headers.get("content-length") ?? 0), i = a.body?.getReader();
  if (!i || r <= 0) {
    const l = await a.arrayBuffer();
    return e?.(1), URL.createObjectURL(new Blob([l], { type: o }));
  }
  const s = [];
  let c = 0;
  for (; ; ) {
    const { done: l, value: p } = await i.read();
    if (l) break;
    p && (s.push(p), c += p.length, e?.(Math.min(1, c / r)));
  }
  const d = new Uint8Array(c);
  let n = 0;
  for (const l of s)
    d.set(l, n), n += l.length;
  return URL.createObjectURL(new Blob([d], { type: o }));
}
async function jt(t, o) {
  if (t.esMismoOrigen)
    return o?.(1), {
      coreURL: t.coreURL,
      wasmURL: t.wasmURL,
      workerURL: t.workerURL ?? "",
      revocarTrasCarga: []
    };
  const e = await re(t.coreURL, "text/javascript"), a = await re(t.wasmURL, "application/wasm", (i) => o?.(i * 0.98));
  o?.(1);
  const r = t.workerURL ? await re(t.workerURL, "text/javascript") : "";
  return { coreURL: e, wasmURL: a, workerURL: r, revocarTrasCarga: [e, a, ...r ? [r] : []] };
}
const Ut = /^Input #(\d+), .*from '(.+)':/, Je = /^\s+Duration: (\d+):(\d{2}):(\d{2}\.\d+)(?:, start: [^,]+)?(?:, bitrate: (\d+) kb\/s)?/, Pt = /^\s+Stream #(\d+):\d+.*?: Audio: ([^,]+), (\d+) Hz, ([^,]+)(?:, ([^,]+))?(?:, (\d+) kb\/s)?/, Ft = /(Invalid data found when processing input|Error opening input|moov atom not found|Unknown input format|decoding -52)/i;
function Bt(t) {
  const o = t.trim().toLowerCase();
  if (o === "mono") return 1;
  if (o === "stereo") return 2;
  if (o === "quad") return 4;
  const e = /^([0-9])\.([0-9])$/.exec(o);
  if (e) return Number(e[1]) + Number(e[2]);
  const a = /(\d+) channels?/.exec(t);
  return a ? Number(a[1]) : 0;
}
function Ye(t, o, e) {
  return Math.round((Number(t) * 3600 + Number(o) * 60 + Number(e)) * 1e3);
}
function Ee(t) {
  const o = /* @__PURE__ */ new Map();
  let e = !1, a = null, r = null, i = null;
  for (const s of t) {
    const c = Ut.exec(s);
    if (c) {
      a = c[2] ?? null, r = null, i = null, a !== null && !o.has(a) && o.set(a, { sinAudio: !0 });
      continue;
    }
    if (Ft.test(s)) {
      e = !0;
      continue;
    }
    if (a === null) continue;
    const d = o.get(a);
    if (!d || "info" in d) continue;
    const n = Je.exec(s);
    if (n) {
      r = Ye(n[1], n[2], n[3]), i = n[4] !== void 0 ? Number(n[4]) : null;
      continue;
    }
    const l = Pt.exec(s);
    l && o.set(a, {
      info: {
        // "mp3 (mp3float)", "aac (LC) (mp4a / …)", "pcm_s16le ([1][0]…)" → primer token.
        codec: (l[2] ?? "").trim().split(/[\s(]/)[0] ?? "",
        sampleRateHz: Number(l[3] ?? 0),
        channels: Bt(l[4] ?? ""),
        bitrateKbps: l[6] !== void 0 ? Number(l[6]) : i,
        durationMs: r
      }
    });
  }
  return { bloques: o, huboErrorApertura: e };
}
function qt(t) {
  for (const o of t) {
    const e = Je.exec(o);
    if (e) return Ye(e[1], e[2], e[3]);
  }
  return null;
}
function we(t) {
  return t.some((o) => /out of memory|memory alloc|abort\(OOM\)|Cannot enlarge memory arrays|RangeError/.test(o));
}
const ie = Ke, Oe = me, Vt = "/medicion", Re = 400;
class Y {
  constructor(o) {
    y(this, "worker", null);
    y(this, "cargado", !1);
    y(this, "promesaCarga", null);
    y(this, "pendientes", /* @__PURE__ */ new Map());
    y(this, "idSiguiente", 1);
    y(this, "lineasLog", []);
    y(this, "oyenteLog", null);
    y(this, "oyenteProgreso", null);
    this.config = o;
  }
  /** Líneas de log retenidas (diagnóstico visible en errores del motor). */
  obtenerLog() {
    return this.lineasLog;
  }
  async ensureLoaded(o) {
    if (this.cargado) return;
    if (this.promesaCarga) return this.promesaCarga;
    const e = $t();
    if (e) throw e;
    if (this.config.engine.mode === "multi" && globalThis.crossOriginIsolated !== !0)
      throw new m({
        code: "WASM_LOAD_FAILED",
        message: "engine-mode=multi exige una página aislada (cabeceras COOP/COEP del anfitrión); usa auto o single, o sirve las cabeceras",
        details: { modo: "multi", crossOriginIsolated: !1 }
      });
    this.promesaCarga = (async () => {
      const a = kt(this.config), r = await jt(a, o);
      try {
        const i = this.crearWorker();
        await this.enviar("load", { coreURL: r.coreURL, wasmURL: r.wasmURL, workerURL: r.workerURL }, i), this.cargado = !0;
      } catch (i) {
        throw this.destruirWorker(), C(i, "WASM_LOAD_FAILED");
      } finally {
        for (const i of r.revocarTrasCarga) URL.revokeObjectURL(i);
      }
    })();
    try {
      await this.promesaCarga;
    } finally {
      this.promesaCarga = null;
    }
  }
  async sondear(o) {
    const e = await this.montar(o);
    try {
      return await this.sondearMontadas(o, e);
    } finally {
      await this.desmontar().catch(() => {
      });
    }
  }
  async sondearMontadas(o, e) {
    const a = ["-hide_banner"];
    for (const d of e) a.push("-i", d);
    a.push("-t", "0.05", "-f", "null", "-");
    const r = [];
    this.lineasLog = r, this.oyenteLog = (d) => r.push(d);
    try {
      await this.enviar("exec", { args: a, timeout: -1 });
    } catch (d) {
      throw this.clasificarFalloEjecucion(d, "PROBE_FAILED");
    } finally {
      this.oyenteLog = null;
    }
    let i = Ee(r);
    const s = o.map((d, n) => n).filter((d) => !i.bloques.has(e[d]));
    if (s.length > 0) {
      const d = new Map(i.bloques);
      let n = 0;
      for (const l of s) {
        const p = [];
        this.oyenteLog = (h) => p.push(h);
        try {
          await this.enviar("exec", { args: ["-hide_banner", "-i", e[l], "-t", "0.05", "-f", "null", "-"], timeout: -1 }).catch(() => {
          });
        } finally {
          this.oyenteLog = null;
        }
        const f = Ee(p);
        f.bloques.size > 0 && (n += f.bloques.size);
        for (const [h, v] of f.bloques) d.set(h, v);
      }
      if (i = { bloques: d, huboErrorApertura: i.huboErrorApertura }, s.length === o.length && n === 0 && o.length > 1)
        throw new m({
          code: "PROBE_FAILED",
          message: `la sonda no pudo abrir ninguna de las ${o.length} entradas`,
          details: { n: o.length }
        });
    }
    return o.map((d, n) => {
      const l = e[n], p = i.bloques.get(l);
      return p && "info" in p ? { id: d.id, info: p.info } : p && "sinAudio" in p ? {
        id: d.id,
        error: new m({
          code: "UNSUPPORTED_FORMAT",
          message: `${d.name}: el archivo no contiene audio decodificable`,
          details: { nombre: d.name }
        })
      } : {
        id: d.id,
        error: new m({
          code: "CORRUPT_FILE",
          message: `${d.name}: no se pudo abrir (datos inválidos)`,
          details: { nombre: d.name }
        })
      };
    });
  }
  async ejecutar(o, e, a) {
    await this.montar(e);
    try {
      return await this.ejecutarMontadas(o, a);
    } finally {
      await this.desmontar().catch(() => {
      });
    }
  }
  async ejecutarMontadas(o, e) {
    if (o.listaConcat) {
      const s = `${o.listaConcat.join(`
`)}
`;
      await this.enviar("write", { ruta: `${Oe}/list.txt`, datos: s });
    }
    const a = [];
    this.lineasLog = a, this.oyenteLog = (s) => a.push(s);
    const r = o.expectedDurationMs !== null ? o.expectedDurationMs * 1e3 : null;
    this.oyenteProgreso = ({ time: s, progress: c }) => {
      r && s > 0 ? e?.(Math.min(1, s / r)) : typeof c == "number" && c > 0 && e?.(Math.min(1, c));
    };
    let i;
    try {
      const s = await this.enviar("exec", { args: [...o.args], timeout: -1 });
      if (s !== 0 && we(a))
        throw new m({
          code: "OUT_OF_MEMORY",
          message: `ffmpeg agotó la memoria (ret=${s}); últimas líneas: ${a.slice(-5).join(" | ")}`,
          details: { ret: s }
        });
      if (s !== 0)
        throw new m({
          code: "UNKNOWN_ENGINE_ERROR",
          message: `ffmpeg terminó con código ${s}; últimas líneas: ${a.slice(-5).join(" | ")}`,
          details: { ret: s }
        });
      i = await this.enviar("read", { ruta: o.outputInternalName });
    } catch (s) {
      throw this.clasificarFalloEjecucion(s, "UNKNOWN_ENGINE_ERROR");
    } finally {
      this.oyenteLog = null, this.oyenteProgreso = null;
    }
    return await this.enviar("delete", { ruta: o.outputInternalName }).catch(() => {
    }), o.listaConcat && await this.enviar("delete", { ruta: `${Oe}/list.txt` }).catch(() => {
    }), i;
  }
  async medirDuracion(o) {
    const e = Vt, a = new File([o], "medicion", { type: o.type });
    if (!(await this.enviar("mount", { fsType: "WORKERFS", options: { files: [a] }, mountPoint: e })).disponible)
      throw new m({ code: "WORKERFS_UNAVAILABLE", message: "WORKERFS no está disponible en este core" });
    const i = [];
    this.lineasLog = i, this.oyenteLog = (s) => i.push(s);
    try {
      await this.enviar("exec", { args: ["-hide_banner", "-i", `${e}/medicion`], timeout: -1 }).catch(() => {
      });
    } finally {
      this.oyenteLog = null;
    }
    return await this.enviar("unmount", { mountPoint: e }).catch(() => {
    }), qt(i);
  }
  cancelar() {
    for (const [, o] of this.pendientes)
      o.reject(new DOMException("motor cancelado", "AbortError"));
    this.pendientes.clear(), this.destruirWorker(), this.cargado = !1;
  }
  dispose() {
    this.cancelar();
  }
  // ——— internos ———
  crearWorker() {
    this.destruirWorker();
    const o = new Worker(zt());
    return o.onmessage = (e) => {
      const a = e.data;
      if (a.tipo === "log") {
        const c = a.datos?.message ?? "";
        c && (this.lineasLog.push(c), this.lineasLog.length > Re && this.lineasLog.splice(0, this.lineasLog.length - Re), this.oyenteLog?.(c));
        return;
      }
      if (a.tipo === "progress") {
        this.oyenteProgreso?.(a.datos);
        return;
      }
      const r = a.id ?? 0, i = this.pendientes.get(r);
      i && (this.pendientes.delete(r), a.tipo === "ok" ? i.resolve(a.datos) : i.reject(new Error(String(a.datos ?? "error del motor"))));
    }, o.onerror = (e) => {
      const a = new Error(`worker del motor: ${e.message}`);
      for (const [, r] of this.pendientes) r.reject(a);
      this.pendientes.clear(), this.destruirWorker(), this.cargado = !1;
    }, this.worker = o, o;
  }
  destruirWorker() {
    this.worker && (this.worker.onmessage = null, this.worker.onerror = null, this.worker.terminate(), this.worker = null), this.cargado = !1;
  }
  enviar(o, e, a) {
    const r = a ?? this.worker;
    if (!r) return Promise.reject(new m({ code: "WASM_LOAD_FAILED", message: "motor no inicializado" }));
    const i = this.idSiguiente++;
    return new Promise((s, c) => {
      this.pendientes.set(i, { resolve: s, reject: c }), r.postMessage({ id: i, tipo: o, datos: e });
    });
  }
  async montar(o) {
    await this.ensureLoaded(), await this.desmontar().catch(() => {
    });
    const e = o.length, a = [], r = [];
    for (let s = 0; s < e; s++) {
      const c = o[s], d = $e(c.name), n = Ge(s, d, e);
      r.push(`${ie}/${n}`), a.push(new File([c.blob], n, { type: c.blob.type }));
    }
    if (!(await this.enviar("mount", { fsType: "WORKERFS", options: { files: a }, mountPoint: ie })).disponible)
      throw new m({
        code: "WORKERFS_UNAVAILABLE",
        message: "WORKERFS no está registrado en este core: las entradas no se pueden transmitir",
        details: {}
      });
    return r;
  }
  async desmontar() {
    await this.enviar("unmount", { mountPoint: ie }).catch(() => {
    });
  }
  clasificarFalloEjecucion(o, e) {
    if (o instanceof m) return o;
    const a = C(o, e);
    return we(this.lineasLog) ? new m({
      code: "OUT_OF_MEMORY",
      message: `ffmpeg agotó la memoria; últimas líneas: ${this.lineasLog.slice(-5).join(" | ")}`,
      cause: o
    }) : a;
  }
}
const H = "fadeMs", Wt = 0.5, J = (t) => (t / 1e3).toFixed(3);
function Gt() {
  ne({
    esquema: { key: H, type: "int", min: 0, max: 1e4, default: 0 },
    etiquetaKey: "opcion.fade"
  }), It({
    id: "fundido",
    optionKey: H,
    requiereRecodificacion: !0,
    aplica: (t) => Number(t[H] ?? 0) > 0,
    transformar: (t, o) => {
      const e = Math.max(0, Number(o.opciones[H] ?? 0));
      if (e === 0 || t.strategy !== "reencode") return t;
      const a = t.rutasInternas.map((r, i) => {
        const s = [...t.filtros[i] ?? []], c = o.sonda[i]?.info.durationMs ?? null;
        if (c === null || c <= 0)
          return s.push(`afade=t=in:st=0:d=${J(e)}`), s;
        const d = c / 1e3, n = Math.min(e / 1e3, d * Wt);
        return s.push(`afade=t=in:st=0:d=${J(n * 1e3)}`), s.push(`afade=t=out:st=${J(Math.max(0, d - n) * 1e3)}:d=${J(n * 1e3)}`), s;
      });
      return { ...t, filtros: a };
    }
  });
}
const Kt = (t) => ({
  porId: /* @__PURE__ */ new Map(),
  orden: [],
  opciones: t,
  job: null,
  error: null,
  resultado: null,
  avisoPendiente: null
});
function x(t, o) {
  switch (o.tipo) {
    case "ANADIR_PISTAS": {
      const e = new Map(t.porId);
      for (const a of o.pistas) {
        if (e.has(a.id))
          throw new m({ code: "INVALID_ORDER", message: `id duplicado al añadir: ${a.id}`, details: { id: a.id } });
        e.set(a.id, a);
      }
      return { ...t, porId: e, orden: [...t.orden, ...o.pistas.map((a) => a.id)], avisoPendiente: null };
    }
    case "ACTUALIZAR_PISTA": {
      const e = t.porId.get(o.id);
      if (!e)
        throw new m({ code: "INVALID_ORDER", message: `id desconocido al actualizar: ${o.id}`, details: { id: o.id } });
      const a = new Map(t.porId);
      return a.set(o.id, { ...e, ...o.cambios, id: e.id, createdAt: e.createdAt }), { ...t, porId: a };
    }
    case "QUITAR_PISTA": {
      if (!t.porId.has(o.id))
        throw new m({ code: "INVALID_ORDER", message: `id desconocido al quitar: ${o.id}`, details: { id: o.id } });
      const e = new Map(t.porId);
      return e.delete(o.id), { ...t, porId: e, orden: t.orden.filter((a) => a !== o.id) };
    }
    case "MOVER":
      return { ...t, orden: ke(t.orden, o.de, o.a) };
    case "MOVER_ID":
      return { ...t, orden: yt(t.orden, o.id, o.delta) };
    case "REORDENAR": {
      if (!xt(t.orden, o.orden, t.porId))
        throw new m({
          code: "INVALID_ORDER",
          message: "el orden propuesto no es una permutación del actual",
          details: { actual: t.orden.length, propuesto: o.orden.length }
        });
      return { ...t, orden: [...o.orden] };
    }
    case "FIJAR_OPCIONES":
      return { ...t, opciones: o.opciones, avisoPendiente: null };
    case "AVISO_PENDIENTE":
      return { ...t, avisoPendiente: o.razones };
    case "LIMPIAR_AVISO":
      return { ...t, avisoPendiente: null };
    case "JOB_INICIADO": {
      if (t.job?.status === "running")
        throw new m({ code: "JOB_IN_PROGRESS", message: "JOB_INICIADO con un job en curso", details: { jobId: t.job.id } });
      return { ...t, job: o.job, error: null, resultado: null, avisoPendiente: null };
    }
    case "JOB_PROGRESO":
      return t.job?.status !== "running" || o.job.id !== t.job.id ? t : { ...t, job: o.job };
    case "JOB_COMPLETADO": {
      if (t.job?.status !== "running" || o.jobId !== t.job.id) return t;
      const e = { ...t.job, status: "completed", progress: 1, finishedAt: Date.now() };
      return { ...t, job: e, resultado: o.resultado, error: null, avisoPendiente: null };
    }
    case "JOB_ERROR":
      return t.job?.status !== "running" || o.jobId !== t.job.id ? t : { ...t, job: null, error: o.error, resultado: null, avisoPendiente: null };
    case "JOB_CANCELADO":
      return {
        ...t,
        job: null,
        resultado: null,
        error: new m({ code: "USER_CANCELLED", message: "unión cancelada por el usuario" })
      };
    case "ERROR":
      return { ...t, error: o.error };
    case "REINICIAR":
      return { ...t, job: null, error: null, resultado: null, avisoPendiente: null };
    case "LIMPIAR_LISTA":
      return { ...t, porId: /* @__PURE__ */ new Map(), orden: [], job: null, resultado: null, error: null, avisoPendiente: null };
    default: {
      const e = o;
      throw new m({ code: "UNKNOWN_ENGINE_ERROR", message: `acción no tratada: ${JSON.stringify(e)}` });
    }
  }
}
function Ae(t) {
  if (!De(t.orden, t.porId))
    throw new m({ code: "INVALID_ORDER", message: "estado inconsistente: orden con ids desconocidos" });
  return t.orden.map((o) => t.porId.get(o)).filter((o) => o !== void 0 && o.status === "ready");
}
const de = {
  // — App —
  "app.titulo": "Fusionador de audio",
  "app.subtitulo": "Todo se procesa en tu navegador: tus archivos no salen de tu dispositivo.",
  // — Zona de carga —
  "dropzone.titulo": "Arrastra tus audios aquí",
  "dropzone.examinar": "o pulsa para seleccionarlos",
  "dropzone.formatos": "Formatos admitidos: {formatos}",
  "dropzone.max": "Máximo {n} pistas",
  "dropzone.label": "Añadir archivos de audio",
  // — Barra de herramientas —
  "toolbar.pista1": "{n} pista",
  "toolbar.pistas": "{n} pistas",
  "toolbar.duracion": "Duración total: {duracion}",
  "toolbar.duracionDesconocida": "Duración total: desconocida",
  "toolbar.tamano": "Entrada: {tamano}",
  "toolbar.formato": "Formato de salida",
  "toolbar.unir": "Unir audios",
  "toolbar.unirAyuda": "Añade al menos {n} pistas válidas para unir",
  "toolbar.cancelar": "Cancelar",
  "toolbar.vaciar": "Vaciar lista",
  // — Fila de pista —
  "pista.subir": "Subir {nombre}",
  "pista.bajar": "Bajar {nombre}",
  "pista.quitar": "Quitar {nombre}",
  "pista.mango": "Arrastrar para reordenar {nombre}",
  "pista.numero": "Pista {n}",
  "pista.duracionDesconocida": "duración desconocida",
  "pista.nombreVacio": "(sin nombre)",
  "pista.noUnible": "No se puede unir",
  "pista.analizando": "Leyendo metadatos…",
  // — Lista —
  "lista.label": "Lista de pistas ordenable",
  "lista.vacia": "Aún no hay pistas. Añade audios para empezar.",
  "lista.virtual": "Lista larga: reordena con los botones ↑ y ↓ para mantener la fluidez.",
  // — Estados / progreso —
  "estado.motor": "Descargando el motor de audio (unos 32 MB, solo la primera vez)… {pct}%",
  "estado.sonda": "Analizando {conocidos} pistas…",
  "estado.uniendo": "Uniendo… {pct}%",
  "estado.validando": "Comprobando el resultado…",
  "estado.completado": "Unión completada",
  "estado.cancelado": "Unión cancelada",
  "estado.error": "Error en la unión",
  "estado.progresoLabel": "Progreso de la unión",
  // — Resultado —
  "resultado.titulo": "¡Listo! Tu audio unido",
  "resultado.descargar": "Descargar",
  "resultado.otra": "Hacer otra unión",
  "resultado.duracion": "Duración",
  "resultado.tamano": "Tamaño",
  "resultado.formato": "Formato",
  "resultado.estrategiaCopia": "copia exacta (rápido)",
  "resultado.estrategiaRecodificacion": "convertido al formato elegido",
  "resultado.preescucha": "Preescucha",
  "resultado.duracionDesconocida": "desconocida",
  // — Diálogo de advertencia —
  "aviso.titulo": "Unión grande",
  "aviso.cuerpo": "La unión estimada pesa {tamano} y dura {duracion}. El proceso puede tardar y consumir mucha memoria. ¿Quieres continuar?",
  "aviso.duracionDesconocida": "duración desconocida (podría ser mayor)",
  "aviso.continuar": "Continuar",
  "aviso.cancelar": "Cancelar",
  // — Errores: mensaje + consejo accionable por código —
  "error.UNSUPPORTED_FORMAT.mensaje": "Formato no admitido: {formato}",
  "error.UNSUPPORTED_FORMAT.consejo": "Los formatos admitidos son: {formatos}. Convierte el archivo a uno de ellos y vuelve a añadirlo.",
  "error.FILE_TOO_LARGE.mensaje": "«{nombre}» supera el límite de {limite}.",
  "error.FILE_TOO_LARGE.consejo": "Quita el archivo o sustitúyelo por una versión más ligera.",
  "error.TOTAL_TOO_LARGE.mensaje": "Entre todos los archivos se supera el límite total de {limite}.",
  "error.TOTAL_TOO_LARGE.consejo": "Quita pistas hasta bajar del límite total.",
  "error.DURATION_TOO_LONG.mensaje": "La duración total ({duracion}) supera el máximo configurado.",
  "error.DURATION_TOO_LONG.consejo": "Quita pistas o amplía el límite de duración.",
  "error.OUT_OF_MEMORY.mensaje": "El navegador se quedó sin memoria durante la unión.",
  "error.OUT_OF_MEMORY.consejo": "Prueba con menos pistas, una salida más comprimida (MP3 en lugar de WAV) o cierra otras pestañas y reintenta.",
  "error.WASM_LOAD_FAILED.mensaje": "No se pudo cargar el motor de audio.",
  "error.WASM_LOAD_FAILED.consejo": "Revisa tu conexión y reintenta. Si sigue fallando, recarga la página.",
  "error.BROWSER_UNSUPPORTED.mensaje": "Tu navegador es demasiado antiguo para esta herramienta.",
  "error.BROWSER_UNSUPPORTED.consejo": "Actualiza a Chrome, Edge o Firefox ≥ 111, o Safari ≥ 16.4.",
  "error.USER_CANCELLED.mensaje": "Cancelaste la unión.",
  "error.USER_CANCELLED.consejo": "Puedes volver a empezar cuando quieras.",
  "error.INVALID_ORDER.mensaje": "Reorden inválido.",
  "error.INVALID_ORDER.consejo": "Los índices deben estar dentro de la lista actual.",
  "error.INVALID_OPTIONS.mensaje": "Opciones inválidas: {detalle}",
  "error.INVALID_OPTIONS.consejo": "Revisa el formato y la calidad elegidos.",
  "error.NOT_ENOUGH_TRACKS.mensaje": "Se necesitan al menos {n} pistas válidas para unir.",
  "error.NOT_ENOUGH_TRACKS.consejo": "Añade más audios válidos a la lista.",
  "error.TOO_MANY_TRACKS.mensaje": "Se alcanzó el máximo de {n} pistas.",
  "error.TOO_MANY_TRACKS.consejo": "Quita pistas de la lista para seguir.",
  "error.CORRUPT_FILE.mensaje": "«{nombre}» está dañado o no es un audio válido.",
  "error.CORRUPT_FILE.consejo": "Vuelve a exportar el archivo o quítalo de la lista.",
  "error.CONFIG_INVALID.mensaje": "Configuración inválida: {detalle}",
  "error.CONFIG_INVALID.consejo": "Revisa la configuración de la herramienta (límites y URLs).",
  "error.JOB_IN_PROGRESS.mensaje": "Ya hay una unión en curso.",
  "error.JOB_IN_PROGRESS.consejo": "Espera a que termine o cancélala antes de empezar otra.",
  "error.WORKERFS_UNAVAILABLE.mensaje": "El navegador no puede procesar tantos datos de golpe.",
  "error.WORKERFS_UNAVAILABLE.consejo": "Une menos archivos a la vez o usa archivos más pequeños.",
  "error.PROBE_FAILED.mensaje": "No se pudo analizar {nombres}.",
  "error.PROBE_FAILED.consejo": "Comprueba que los archivos son audios válidos; quita los problemáticos e reintenta.",
  "error.UNKNOWN_ENGINE_ERROR.mensaje": "Error inesperado del motor de audio.",
  "error.UNKNOWN_ENGINE_ERROR.consejo": "Reintenta; si persiste, recarga la página.",
  // — Advertencias (no fatales, visibles) —
  "avisoCodigo.DURATION_MISMATCH": "La duración del resultado ({obtenida}) no coincide con la esperada ({esperada}). Revisa el audio antes de usarlo.",
  "avisoCodigo.DURATION_ESTIMATED": "La estimación se hizo con datos parciales: la duración real puede variar.",
  "avisoCodigo.ENGINE_RESTARTED": "El motor se reinició tras la unión para liberar memoria (salida muy grande).",
  // — Etiquetas de formatos y opciones (los descriptores referencian claves, no texto) —
  "formato.mp3": "MP3",
  "formato.wav": "WAV",
  "formato.ogg": "OGG",
  "formato.m4a": "M4A",
  "formato.flac": "FLAC",
  "formato.opus": "OPUS",
  "salida.mp3": "MP3 (compatible en todas partes)",
  "salida.wav": "WAV (sin pérdida)",
  "opcion.bitrate": "Calidad",
  "opcion.fade": "Fundido entre pistas (ms)",
  // — Accesibilidad / anuncios —
  "a11y.anadidas": "{n} pistas añadidas",
  "a11y.quitada": "Pista quitada: {nombre}",
  "a11y.movida": "«{nombre}» movida a la posición {pos}",
  "a11y.rechazada": "Pista rechazada: {nombre} — {motivo}",
  // — Miscelánea —
  "misc.reintentar": "Reintentar"
}, ce = /* @__PURE__ */ new Map([["es", de]]);
let Qe = "es";
function Ht(t) {
  if (!ce.has(t))
    throw new Error(`fijarLocale: idioma no registrado «${t}» (disponibles: ${[...ce.keys()].join(", ")})`);
  Qe = t;
}
function u(t, o) {
  const a = (ce.get(Qe) ?? de)[t] ?? de[t];
  return a === void 0 ? `⟨falta texto: ${t}⟩` : o ? a.replace(/\{([a-zA-Z0-9_]+)\}/g, (r, i) => i in o ? String(o[i]) : `{${i}}`) : a;
}
function _e() {
  const t = typeof globalThis < "u" ? globalThis.crypto : void 0;
  if (t && typeof t.randomUUID == "function") return t.randomUUID();
  const o = (e) => Array.from({ length: e }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${o(8)}-${o(4)}-4${o(3)}-8${o(3)}-${o(12)}`;
}
function Jt(t) {
  return new Promise((o) => {
    if (typeof globalThis.URL?.createObjectURL != "function" || typeof document > "u") {
      o(null);
      return;
    }
    const a = URL.createObjectURL(t), r = document.createElement("audio");
    r.preload = "metadata";
    let i = null, s = !1;
    const c = (d) => {
      if (!s) {
        s = !0, i !== null && clearTimeout(i);
        try {
          URL.revokeObjectURL(a), r.removeAttribute("src");
        } catch {
        }
        o(d);
      }
    };
    i = setTimeout(() => c(null), 1e4), r.onloadedmetadata = () => {
      const d = r.duration;
      c(Number.isFinite(d) && d > 0 ? Math.round(d * 1e3) : null);
    }, r.onerror = () => c(null), r.src = a;
  });
}
function Yt(t) {
  const o = Math.max(0, Math.floor(t.scrollTop / t.alturaFila)), e = Math.max(1, Math.ceil(t.alturaContenedor / t.alturaFila)), a = Math.max(0, o - t.overscan), r = Math.min(t.total, o + e + t.overscan);
  return { inicio: a, fin: r };
}
const Le = `:host{display:block;box-sizing:border-box}*,*::before,*::after{box-sizing:inherit}.am-root{--am-fondo:#fdfbf4;--am-superficie:#f4f0e4;--am-borde:#e2dbc8;--am-texto:#17211b;--am-texto-suave:#5e6a5e;--am-acento:#0e8a62;--am-acento-suave:#e1f2ea;--am-acento-texto:#0b6a4c;--am-peligro:#b3261e;--am-peligro-suave:#fdeceb;--am-aviso:#92610a;--am-aviso-suave:#fbf3df;--am-radio:20px;font-family:var(--am-font,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);color:var(--am-texto);background:var(--am-fondo);border:1px solid var(--am-borde);border-radius:var(--am-radio);padding:22px;display:flex;flex-direction:column;gap:14px;line-height:1.5}.am-root[data-theme="dark"]{--am-fondo:#0d1712;--am-superficie:#101d16;--am-borde:#24382c;--am-texto:#eaf3ed;--am-texto-suave:#a9bfb1;--am-acento:#3ed598;--am-acento-suave:#0f2e22;--am-acento-texto:#7cebc0;--am-peligro:#ff8a80;--am-peligro-suave:#2e1512;--am-aviso:#ffd37a;--am-aviso-suave:#2e2310}@media (prefers-color-scheme:dark){.am-root[data-theme="auto"]{--am-fondo:#0d1712;--am-superficie:#101d16;--am-borde:#24382c;--am-texto:#eaf3ed;--am-texto-suave:#a9bfb1;--am-acento:#3ed598;--am-acento-suave:#0f2e22;--am-acento-texto:#7cebc0;--am-peligro:#ff8a80;--am-peligro-suave:#2e1512;--am-aviso:#ffd37a;--am-aviso-suave:#2e2310}}.am-cabecera{display:flex;flex-direction:column;gap:2px}.am-titulo{font-size:1.25rem;font-weight:700;display:flex;align-items:center;gap:8px;letter-spacing:-0.01em}.am-titulo svg{width:22px;height:22px;color:var(--am-acento);flex:none}.am-subtitulo{font-size:0.875rem;color:var(--am-texto-suave)}.am-zona{border:2px dashed var(--am-borde);border-radius:calc(var(--am-radio) - 4px);background:var(--am-superficie);padding:24px 16px;text-align:center;cursor:pointer;transition:border-color 0.15s ease,background 0.15s ease;display:flex;flex-direction:column;align-items:center;gap:6px}.am-zona:hover{border-color:var(--am-acento)}.am-zona:focus-visible{border-color:var(--am-acento);outline:2px solid var(--am-acento);outline-offset:2px}.am-zona[data-activa="true"]{border-color:var(--am-acento);background:var(--am-acento-suave)}.am-zona svg{width:30px;height:30px;color:var(--am-acento)}.am-zona__titulo{font-weight:600}.am-zona__titulo button{background:none;border:none;padding:0;color:var(--am-acento-texto);font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.am-zona__pistas{font-size:0.8125rem;color:var(--am-texto-suave)}.am-herramientas{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--am-borde);border-radius:12px;background:var(--am-superficie)}.am-herramientas:empty{display:none}.am-totales{display:flex;flex-direction:column;font-size:0.8125rem;color:var(--am-texto-suave);margin-right:auto}.am-totales b{color:var(--am-texto);font-weight:600}.am-campo{display:flex;flex-direction:column;gap:2px;font-size:0.75rem;color:var(--am-texto-suave)}.am-campo select{font:inherit;padding:6px 8px;border-radius:9px;border:1px solid var(--am-borde);background:var(--am-fondo);color:var(--am-texto);min-width:120px}.am-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;position:relative}.am-fila{display:grid;grid-template-columns:26px 30px 1fr auto auto;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--am-borde);border-radius:12px;background:var(--am-fondo);transition:border-color 0.12s ease,box-shadow 0.12s ease}.am-fila[draggable="true"]{cursor:grab}.am-fila[data-estado="invalid"]{border-color:var(--am-peligro);background:var(--am-peligro-suave)}.am-fila[data-sobre="true"]{border-color:var(--am-acento);box-shadow:0 0 0 2px var(--am-acento-suave)}.am-fila[data-origen="true"]{opacity:0.55}.am-fila__mango{color:var(--am-texto-suave);display:flex;align-items:center;justify-content:center}.am-fila__mango svg{width:16px;height:16px}.am-fila__num{font-size:0.75rem;font-variant-numeric:tabular-nums;color:var(--am-acento-texto);border:1px solid var(--am-borde);border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex:none}.am-fila__cuerpo{min-width:0;display:flex;flex-direction:column;gap:2px}.am-fila__nombre{font-weight:600;font-size:0.9375rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.am-fila__meta{font-size:0.75rem;color:var(--am-texto-suave);display:flex;gap:8px;flex-wrap:wrap}.am-chip{font-size:0.6875rem;font-weight:600;padding:1px 8px;border-radius:999px;background:var(--am-acento-suave);color:var(--am-acento-texto)}.am-chip[data-tipo="invalid"]{background:var(--am-peligro-suave);color:var(--am-peligro)}.am-chip[data-tipo="aviso"]{background:var(--am-aviso-suave);color:var(--am-aviso)}.am-fila__acciones{display:flex;gap:4px}.am-btn-icono{width:44px;height:44px;border-radius:10px;border:1px solid var(--am-borde);background:var(--am-fondo);color:var(--am-texto);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:0.9rem;transition:border-color 0.12s ease,color 0.12s ease}.am-btn-icono svg{width:16px;height:16px}.am-btn-icono:hover:not(:disabled){border-color:var(--am-acento);color:var(--am-acento-texto)}.am-btn-icono:focus-visible{outline:2px solid var(--am-acento);outline-offset:1px}.am-btn-icono:disabled{opacity:0.35;cursor:default}.am-btn-icono[data-tipo="peligro"]:hover:not(:disabled){border-color:var(--am-peligro);color:var(--am-peligro)}.am-vacia{padding:10px;text-align:center;color:var(--am-texto-suave);font-size:0.875rem}.am-nota-virtual{font-size:0.75rem;color:var(--am-texto-suave);padding:6px 10px;background:var(--am-superficie);border-radius:8px}.am-estado{display:flex;flex-direction:column;gap:8px}.am-estado:has(> .am-estado__texto:empty){display:none}.am-estado__texto{font-size:0.875rem;color:var(--am-texto-suave);display:flex;gap:8px;align-items:center}.am-estado__texto[data-tono="error"]{color:var(--am-peligro)}.am-estado__texto[data-tono="ok"]{color:var(--am-acento-texto)}.am-progreso{height:8px;border-radius:999px;background:var(--am-borde);overflow:hidden}.am-progreso__barra{height:100%;width:0%;background:linear-gradient(90deg,var(--am-acento),var(--am-acento-texto));border-radius:999px;transition:width 0.2s ease}.am-resultado{border:1px solid var(--am-acento);background:var(--am-acento-suave);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}.am-resultado__titulo{font-weight:700;color:var(--am-acento-texto);display:flex;gap:8px;align-items:center}.am-resultado__titulo svg{width:20px;height:20px}.am-resultado__meta{font-size:0.8125rem;color:var(--am-texto-suave);display:flex;gap:12px;flex-wrap:wrap}.am-resultado__acciones{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.am-resultado audio{width:100%;max-width:420px}.am-avisos{display:flex;flex-direction:column;gap:4px;font-size:0.75rem;color:var(--am-aviso)}.am-error{border:1px solid var(--am-peligro);background:var(--am-peligro-suave);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}.am-error__titulo{font-weight:700;color:var(--am-peligro)}.am-error__detalle{font-size:0.875rem}.am-error__consejo{font-size:0.8125rem;color:var(--am-texto-suave)}.am-error__codigo{font-family:ui-monospace,monospace;font-size:0.6875rem;color:var(--am-texto-suave)}.am-btn{font:inherit;font-weight:600;padding:10px 18px;border-radius:12px;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:8px}.am-btn svg{width:16px;height:16px}.am-btn--primario{background:var(--am-acento);color:#06231a;box-shadow:0 6px 18px -6px rgba(62,213,152,0.35)}.am-btn--primario:hover:not(:disabled){filter:brightness(1.05);transform:translateY(-1px)}.am-btn--primario:disabled{opacity:0.45;cursor:default;box-shadow:none}.am-btn--fantasma{background:transparent;color:var(--am-texto);border-color:var(--am-borde)}.am-btn--fantasma:hover:not(:disabled){border-color:var(--am-acento);color:var(--am-acento-texto)}.am-btn--peligro{background:transparent;color:var(--am-peligro);border-color:var(--am-peligro)}.am-btn:focus-visible{outline:2px solid var(--am-acento);outline-offset:2px}.am-dialogo-fondo{position:fixed;inset:0;background:rgb(0 0 0 / 0.55);display:flex;align-items:center;justify-content:center;z-index:2147483647;padding:16px}.am-dialogo{background:var(--am-fondo);color:var(--am-texto);border-radius:20px;padding:20px;max-width:480px;width:100%;border:1px solid var(--am-borde);display:flex;flex-direction:column;gap:12px;box-shadow:0 24px 60px rgb(0 0 0 / 0.5)}.am-dialogo__titulo{font-weight:700;font-size:1.0625rem;display:flex;gap:8px;align-items:center;color:var(--am-aviso)}.am-dialogo__cuerpo{font-size:0.9375rem}.am-dialogo__acciones{display:flex;gap:8px;justify-content:flex-end}.am-solo-lectores{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
/* Móvil (≤640px): la fila de pista pasa a 2 bandas (número+nombre arriba,
   acciones abajo) — con botones táctiles de 44px la cuadrícula de 5 columnas
   dejaba ~38px para el nombre y lo truncaba («ton…»). El mango oculto:
   reorden por botones. */
@media (max-width:640px){.am-fila{grid-template-columns:28px minmax(0,1fr);grid-template-rows:auto auto;row-gap:6px}.am-fila__mango{display:none}.am-fila__cuerpo{grid-column:2;grid-row:1;min-width:0}.am-fila__acciones{grid-column:1/-1;grid-row:2;justify-content:flex-end}}`, I = {
  onda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12h2l2-6 3 12 3-16 3 16 2-6h3"/></svg>',
  subir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  quitar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  descargar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>',
  mango: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  aviso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>'
}, Qt = "1.0.0", Ie = "audio-merger", Zt = {
  "audio/mpeg": "MP3",
  "audio/mp3": "MP3",
  "audio/wav": "WAV",
  "audio/x-wav": "WAV",
  "audio/wave": "WAV",
  "audio/vnd.wave": "WAV",
  "audio/ogg": "OGG",
  "application/ogg": "OGG",
  "audio/vorbis": "OGG",
  "audio/flac": "FLAC",
  "audio/x-flac": "FLAC",
  "audio/mp4": "M4A",
  "audio/m4a": "M4A",
  "audio/x-m4a": "M4A",
  "audio/aac": "AAC",
  "audio/webm": "WebM"
}, Xt = (t) => Zt[t] ?? t, ea = typeof HTMLElement < "u" ? HTMLElement : class {
};
class ta extends ea {
  constructor() {
    super();
    y(this, "estado", Kt({ format: "mp3", bitrateKbps: 192, fadeMs: 0 }));
    y(this, "config", Q);
    y(this, "motor", null);
    y(this, "controlador", null);
    y(this, "archivos", /* @__PURE__ */ new Map());
    y(this, "sombra", null);
    y(this, "hoja", null);
    y(this, "filas", /* @__PURE__ */ new Map());
    y(this, "idArrastrandose", null);
    y(this, "avisoResolver", null);
    /** true mientras una unión está en vuelo (incluye el diálogo de aviso): un solo job. */
    y(this, "unionEnCurso", !1);
    y(this, "estructural", {});
    this.attachShadowIfPossible();
  }
  static get observedAttributes() {
    return se.map((e) => e.nombre);
  }
  attachShadowIfPossible() {
    typeof ShadowRoot < "u" && this.shadowRoot === null ? this.sombra = this.attachShadow({ mode: "open" }) : this.sombra = this.shadowRoot;
  }
  connectedCallback() {
    if (this.sombra || this.attachShadowIfPossible(), !!this.sombra) {
      try {
        this.hoja = new CSSStyleSheet(), this.hoja.replaceSync(Le), this.sombra.adoptedStyleSheets = [this.hoja];
      } catch {
        const e = document.createElement("style");
        e.textContent = Le, this.sombra.appendChild(e);
      }
      this.aplicarAtributos(), this.renderizarCompleto();
    }
  }
  disconnectedCallback() {
    setTimeout(() => {
      this.isConnected || (this.controlador?.abort(), this.estado.resultado && this.revocarURL(this.estado.resultado.url));
    }, 0);
  }
  attributeChangedCallback(e, a, r) {
    a === r || !this.sombra || (this.aplicarAtributos(), this.renderizarCompleto());
  }
  // ——— Atributos → config/opciones (tabla declarativa, FASE 3) ———
  leerAtributos() {
    const e = {};
    for (const a of se) e[a.nombre] = this.getAttribute(a.nombre);
    return lt(e);
  }
  aplicarAtributos() {
    let e;
    try {
      e = this.leerAtributos();
    } catch (n) {
      const l = C(n, "CONFIG_INVALID");
      this.estado = x(this.estado, { tipo: "ERROR", error: l }), this.emitir(O.error, { code: l.code, message: l.message, details: l.details });
      return;
    }
    const { overridesConfig: a, opciones: r, estructural: i } = e;
    try {
      this.config = Me(a);
    } catch (n) {
      const l = C(n, "CONFIG_INVALID");
      this.estado = x(this.estado, { tipo: "ERROR", error: l }), this.emitir(O.error, { code: l.code, message: l.message, details: l.details });
      return;
    }
    Ht(this.config.i18n.locale), (!this.unionEnCurso || !this.motor) && (this.motor = new Y(this.config));
    const s = Z()[0]?.id ?? "mp3", c = j(String(r.format ?? s)), d = { ...r };
    "format" in d || (d.format = s), "bitrateKbps" in d || (d.bitrateKbps = c?.bitratePorDefecto ?? null), "fadeMs" in d || (d.fadeMs = 0);
    try {
      const n = { ...this.estado.opciones, ...d };
      this.estado = x(this.estado, { tipo: "FIJAR_OPCIONES", opciones: n });
    } catch {
    }
    this.estructural = i;
  }
  // ——— API pública (FASE 3) ———
  get tracks() {
    return this.estado.orden.map((e) => this.estado.porId.get(e));
  }
  get options() {
    return this.estado.opciones;
  }
  get state() {
    return this.estado.job?.status === "running" ? "running" : this.estado.resultado ? "completed" : this.estado.error ? this.estado.error.code === "USER_CANCELLED" ? "cancelled" : "error" : this.estado.orden.some((e) => this.estado.porId.get(e)?.status === "analyzing") ? "analyzing" : "idle";
  }
  get result() {
    const e = this.estado.resultado;
    return e ? {
      blob: e.blob,
      name: e.name,
      mimeType: e.mimeType,
      size: e.size,
      durationMs: e.durationMs,
      strategy: e.strategy,
      warnings: e.warnings.map((a) => ({ code: a.code, message: a.message, params: a.params }))
    } : null;
  }
  get version() {
    return Qt;
  }
  async addFiles(e) {
    const a = e instanceof FileList || Array.isArray(e) ? Array.from(e) : [e], r = [], i = [], s = K();
    for (const n of a) {
      const l = bt(n, s, this.config.limits);
      if (l) {
        i.push({ pista: n.name, error: l });
        continue;
      }
      const p = Fe(n.name, n.type);
      r.push({
        archivo: n,
        pista: {
          id: _e(),
          createdAt: Date.now(),
          name: n.name,
          size: n.size,
          mimeType: n.type,
          extension: ue(n.name) || p?.id || "bin",
          durationMs: null,
          status: "analyzing",
          probed: null
        }
      });
    }
    const c = this.estado.orden.map((n) => this.estado.porId.get(n)), d = vt(r.map((n) => n.pista), c, this.config.limits);
    for (const n of d.rechazadas) i.push({ pista: n.pista.name, error: n.error });
    if (d.admitidas.length > 0) {
      for (const n of r)
        d.admitidas.includes(n.pista) && this.archivos.set(n.pista.id, n.archivo);
      this.estado = x(this.estado, { tipo: "ANADIR_PISTAS", pistas: d.admitidas }), this.anunciar(u("a11y.anadidas", { n: d.admitidas.length }));
      for (const n of d.admitidas)
        this.emitir(O.pistaAnadida, { pista: n }), this.completarDuracion(n.id);
    }
    for (const n of i)
      this.anunciar(u("a11y.rechazada", { nombre: n.pista, motivo: this.mensajeDeError(n.error, !1) })), this.emitir(O.error, { code: n.error.code, message: n.error.message, details: { ...n.error.details, nombre: n.pista } });
    return this.renderizarHerramientas(), this.renderizarLista(), this.renderizarEstado(), d.admitidas;
  }
  removeTrack(e) {
    const a = this.estado.porId.get(e);
    if (!a) return !1;
    const r = this.estado.orden.indexOf(e);
    return this.estado = x(this.estado, { tipo: "QUITAR_PISTA", id: e }), this.archivos.delete(e), this.anunciar(u("a11y.quitada", { nombre: a.name || u("pista.nombreVacio") })), this.emitir(O.pistaQuitada, { id: e, pista: a }), this.renderizarHerramientas(), this.renderizarLista(), this.renderizarEstado(), this.devolverFoco(r), !0;
  }
  reorder(e, a) {
    return this.estado = x(this.estado, { tipo: "MOVER", de: e, a }), this.emitir(O.reordenado, { orden: [...this.estado.orden], de: e, a, origen: "api" }), this.renderizarLista(), [...this.estado.orden];
  }
  moveTrack(e, a) {
    const r = this.estado.orden.indexOf(e);
    this.estado = x(this.estado, { tipo: "MOVER_ID", id: e, delta: a });
    const i = this.estado.porId.get(e);
    return i && r >= 0 && this.anunciar(u("a11y.movida", { nombre: i.name || u("pista.nombreVacio"), pos: this.estado.orden.indexOf(e) + 1 })), this.emitir(O.reordenado, { orden: [...this.estado.orden], de: r, a: this.estado.orden.indexOf(e), origen: "api" }), this.renderizarLista(), [...this.estado.orden];
  }
  setOptions(e) {
    const a = { ...this.estado.opciones, ...e };
    return this.estado = x(this.estado, { tipo: "FIJAR_OPCIONES", opciones: a }), this.emitir(O.opcionesCambiadas, { opciones: a }), this.renderizarHerramientas(), a;
  }
  reset() {
    this.avisoResolver?.(!1), this.unionEnCurso && this.cancel(), this.estado.resultado && this.revocarURL(this.estado.resultado.url), this.estado = x(this.estado, { tipo: "REINICIAR" }), this.renderizarHerramientas(), this.renderizarLista(), this.renderizarEstado(), this.renderizarResultado();
  }
  clear() {
    this.avisoResolver?.(!1), this.unionEnCurso && this.cancel(), this.estado.resultado && this.revocarURL(this.estado.resultado.url), this.estado = x(this.estado, { tipo: "LIMPIAR_LISTA" }), this.archivos.clear(), this.renderizarHerramientas(), this.renderizarLista(), this.renderizarEstado(), this.renderizarResultado();
  }
  async preloadEngine() {
    this.motor || (this.motor = new Y(this.config)), await this.motor.ensureLoaded();
  }
  async merge() {
    return this.ejecutarUnion();
  }
  cancel() {
    this.controlador?.abort();
  }
  download() {
    const e = this.estado.resultado;
    if (!e) return;
    const a = document.createElement("a");
    a.href = e.url, a.download = e.name, document.body.appendChild(a), a.click(), a.remove();
  }
  // ——— Unión ———
  async ejecutarUnion() {
    if (this.unionEnCurso || this.estado.job?.status === "running") {
      const e = new m({ code: "JOB_IN_PROGRESS", message: "ya hay una unión en curso" });
      throw this.emitir(O.error, { code: e.code, message: e.message, details: e.details }), e;
    }
    this.unionEnCurso = !0;
    try {
      return await this.unionInterna();
    } finally {
      this.unionEnCurso = !1;
    }
  }
  async unionInterna() {
    const e = Ae(this.estado), a = ze(e.length, this.config.limits);
    if (a)
      throw this.emitir(O.error, { code: a.code, message: a.message, details: a.details }), a;
    {
      const s = j(this.estado.opciones.format), c = he(e), d = ge(e, "copy", null), n = s?.bytesPorSegundo(this.estado.opciones.bitrateKbps ?? null) ?? null, l = ge(e, "reencode", n), p = Math.max(d.bytes ?? 0, l.bytes ?? 0) || null, f = Et({ bytes: p, duracionMs: c.duracionMs }, this.config.limits);
      if (f.length > 0) {
        this.estado = x(this.estado, { tipo: "AVISO_PENDIENTE", razones: f }), this.renderizarDialogoAviso(p, c.duracionMs);
        const h = await new Promise((v) => {
          this.avisoResolver = v;
        });
        if (this.avisoResolver = null, this.cerrarDialogoAviso(), !h) {
          const v = new m({ code: "USER_CANCELLED", message: "el usuario no continuó tras el aviso" });
          throw this.estado = x(this.estado, { tipo: "ERROR", error: v }), this.emitir(O.cancelada, { jobId: null }), this.renderizarEstado(), v;
        }
      }
    }
    const r = {
      id: _e(),
      createdAt: Date.now(),
      trackIds: e.map((s) => s.id),
      outputFormat: String(this.estado.opciones.format),
      bitrateKbps: this.estado.opciones.bitrateKbps ?? null,
      status: "running",
      progress: 0,
      stage: "loading-engine",
      startedAt: Date.now()
    };
    this.controlador = new AbortController(), this.estado.resultado && this.revocarURL(this.estado.resultado.url), this.estado = x(this.estado, { tipo: "JOB_INICIADO", job: r }), this.emitir(O.unionIniciada, { job: r }), this.renderizarHerramientas(), this.renderizarEstado();
    const i = e.map((s) => ({ id: s.id, name: s.name, blob: this.archivos.get(s.id) ?? new Blob() }));
    this.motor || (this.motor = new Y(this.config));
    try {
      const s = await je(i, this.estado.opciones, {
        config: this.config,
        motor: this.motor,
        planificador: He,
        validadorContenedor: (n, l) => j(l)?.sniff(n) ?? !1,
        esquemasOpciones: Be(),
        signal: this.controlador.signal,
        onProgress: (n) => {
          this.estado = x(this.estado, {
            tipo: "JOB_PROGRESO",
            job: { ...r, progress: n.progress, stage: n.stage }
          }), this.emitir(O.progresoUnion, { ...n }), this.renderizarEstado();
        }
      });
      this.estado.resultado && this.revocarURL(this.estado.resultado.url);
      const c = URL.createObjectURL(s.blob), d = {
        url: c,
        blob: s.blob,
        name: s.name,
        mimeType: s.mimeType,
        size: s.size,
        durationMs: s.durationMs,
        strategy: s.strategy,
        warnings: s.warnings.map((n) => ({ code: n.code, message: n.message, params: n.params }))
      };
      return this.estado = x(this.estado, { tipo: "JOB_COMPLETADO", jobId: r.id, resultado: d }), this.estado.resultado?.url !== c && this.revocarURL(c), this.emitir(O.unionCompletada, {
        blob: s.blob,
        url: c,
        name: s.name,
        mimeType: s.mimeType,
        size: s.size,
        durationMs: s.durationMs,
        strategy: s.strategy,
        warnings: s.warnings.map((n) => ({ code: n.code, message: n.message, params: n.params }))
      }), this.renderizarHerramientas(), this.renderizarEstado(), this.renderizarResultado(), s;
    } catch (s) {
      const c = C(s);
      throw c.code === "USER_CANCELLED" ? (this.estado = x(this.estado, { tipo: "JOB_CANCELADO" }), this.emitir(O.cancelada, { jobId: r.id })) : (this.marcarPistasInvalidas(c), this.estado = x(this.estado, { tipo: "JOB_ERROR", jobId: r.id, error: c }), this.emitir(O.error, { code: c.code, message: c.message, details: c.details }), this.renderizarLista()), this.renderizarHerramientas(), this.renderizarEstado(), this.renderizarError(), c;
    } finally {
      this.controlador = null;
    }
  }
  /** Marca como inválidas las pistas citadas por un fallo de sonda clasificado. */
  marcarPistasInvalidas(e) {
    if (e.code !== "CORRUPT_FILE" && e.code !== "UNSUPPORTED_FORMAT" && e.code !== "PROBE_FAILED") return;
    const a = Array.isArray(e.details.ids) ? e.details.ids : [];
    for (const r of a)
      this.estado.porId.has(r) && (this.estado = x(this.estado, {
        tipo: "ACTUALIZAR_PISTA",
        id: r,
        cambios: { status: "invalid", errorCode: e.code }
      }));
  }
  async completarDuracion(e) {
    const a = this.archivos.get(e);
    let r = null;
    if (a)
      try {
        r = await Jt(a);
      } catch {
        r = null;
      }
    this.estado.porId.has(e) && (this.estado = x(this.estado, {
      tipo: "ACTUALIZAR_PISTA",
      id: e,
      cambios: { durationMs: r, status: "ready" }
    }), this.renderizarHerramientas(), this.renderizarLista(), this.renderizarEstado());
  }
  // ——— Render ———
  renderizarCompleto() {
    if (!this.sombra || this.estructural.headless === !0) {
      this.sombra && (this.sombra.innerHTML = "");
      return;
    }
    this.sombra.querySelector(".am-root") || (this.sombra.innerHTML = `
        <div class="am-root" data-theme="${this.temaActual()}" part="root">
          <header class="am-cabecera">
            <div class="am-titulo">${I.onda}<span data-ref="titulo"></span></div>
            <div class="am-subtitulo" data-ref="subtitulo"></div>
          </header>
          <section class="am-zona" data-ref="zona" role="button" tabindex="0">
            ${I.onda}
            <div class="am-zona__titulo"><span data-ref="zona-titulo"></span> <button type="button" data-ref="zona-boton"></button></div>
            <div class="am-zona__pistas" data-ref="zona-pistas"></div>
            <input type="file" multiple data-ref="entrada" hidden>
          </section>
          <section class="am-herramientas" data-ref="herramientas"></section>
          <div data-ref="notas"></div>
          <ul class="am-lista" data-ref="lista" role="list" aria-label="">
            <li data-ref="espaciador" aria-hidden="true" style="height:0px"></li>
          </ul>
          <section class="am-estado" data-ref="estado">
            <div class="am-estado__texto" data-ref="estado-texto" role="status" aria-live="polite"></div>
            <div class="am-progreso" data-ref="progreso" hidden><div class="am-progreso__barra" data-ref="progreso-barra"></div></div>
          </section>
          <section data-ref="resultado"></section>
          <section data-ref="error"></section>
          <div data-ref="dialogo"></div>
          <div class="am-solo-lectores" data-ref="anuncios" role="status" aria-live="polite"></div>
        </div>`, this.conectarEventos()), this.renderizarTextos(), this.renderizarHerramientas(), this.renderizarLista(), this.renderizarEstado(), this.renderizarResultado(), this.renderizarError();
  }
  temaActual() {
    const e = this.estructural.theme;
    return typeof e == "string" ? e : "auto";
  }
  ref(e) {
    const a = this.sombra?.querySelector(`[data-ref="${e}"]`);
    if (!a) throw new m({ code: "UNKNOWN_ENGINE_ERROR", message: `referencia interna ausente: ${e}` });
    return a;
  }
  renderizarTextos() {
    if (!this.sombra) return;
    this.ref("titulo").textContent = u("app.titulo"), this.ref("subtitulo").textContent = u("app.subtitulo"), this.ref("zona-titulo").textContent = u("dropzone.titulo"), this.ref("zona-boton").textContent = u("dropzone.examinar"), this.ref("lista").setAttribute("aria-label", u("lista.label")), this.ref("zona").setAttribute("aria-label", u("dropzone.label"));
    const a = K().map((i) => u(i.etiquetaKey)).join(", ");
    this.ref("zona-pistas").textContent = `${u("dropzone.formatos", { formatos: a })} · ${u("dropzone.max", { n: this.config.limits.maxTracks })}`, this.ref("entrada").accept = K().flatMap((i) => i.extensions.map((s) => `.${s}`)).join(",");
    const r = this.sombra.querySelector(".am-root");
    r && r.setAttribute("data-theme", this.temaActual());
  }
  conectarEventos() {
    const e = this.ref("zona"), a = this.ref("entrada");
    e.addEventListener("click", () => a.click()), e.addEventListener("keydown", (r) => {
      (r.key === "Enter" || r.key === " ") && (r.preventDefault(), a.click());
    }), a.addEventListener("change", () => {
      this.addFiles(a.files ?? []), a.value = "";
    }), e.addEventListener("dragover", (r) => {
      r.preventDefault(), e.dataset.activa = "true";
    }), e.addEventListener("dragleave", () => {
      e.dataset.activa = "false";
    }), e.addEventListener("drop", (r) => {
      r.preventDefault(), e.dataset.activa = "false", r.dataTransfer?.files?.length && this.addFiles(r.dataTransfer.files);
    });
  }
  renderizarHerramientas() {
    if (!this.sombra || this.estructural.headless === !0) return;
    const e = this.ref("herramientas"), a = this.estado.orden.map((f) => this.estado.porId.get(f)), r = he(a), i = this.estado.job?.status === "running", s = Ae(this.estado).length, c = !i && s >= this.config.limits.minTracks;
    if (e.innerHTML = "", a.length === 0 && !i) return;
    const d = document.createElement("div");
    d.className = "am-totales";
    const n = a.length === 1 ? u("toolbar.pista1", { n: 1 }) : u("toolbar.pistas", { n: a.length });
    d.innerHTML = "<b></b><span></span>";
    const [l, p] = [d.querySelector("b"), d.querySelector("span")];
    if (l.textContent = n, p.textContent = `${r.duracionMs === null ? u("toolbar.duracionDesconocida") : `${u("toolbar.duracion", { duracion: $(r.duracionMs) })}`} · ${u("toolbar.tamano", { tamano: D(r.bytes) })}`, e.appendChild(d), !i && !this.estado.resultado) {
      const f = Z(), h = this.campoSelect("toolbar.formato", f.map((R) => ({ valor: R.id, etiqueta: u(R.etiquetaKey) })), String(this.estado.opciones.format), (R) => {
        this.setOptions({ format: R });
        const b = j(R);
        b?.bitratesKbps && (this.estado.opciones.bitrateKbps === null || !b.bitratesKbps.includes(this.estado.opciones.bitrateKbps)) && this.setOptions({ bitrateKbps: b.bitratePorDefecto }), b?.bitratesKbps || this.setOptions({ bitrateKbps: null }), this.renderizarHerramientas();
      });
      e.appendChild(h);
      const v = j(String(this.estado.opciones.format));
      if (v?.bitratesKbps) {
        const R = this.campoSelect("opcion.bitrate", v.bitratesKbps.map((b) => ({ valor: String(b), etiqueta: `${b} kbps` })), String(this.estado.opciones.bitrateKbps ?? v.bitratePorDefecto), (b) => {
          this.setOptions({ bitrateKbps: Number(b) });
        });
        e.appendChild(R);
      }
      const E = document.createElement("button");
      E.type = "button", E.className = "am-btn am-btn--primario", E.innerHTML = `${I.ok}<span></span>`, E.querySelector("span").textContent = u("toolbar.unir"), E.disabled = !c, c || (E.title = u("toolbar.unirAyuda", { n: this.config.limits.minTracks })), E.addEventListener("click", () => {
        this.ejecutarUnion();
      }), e.appendChild(E);
    }
    if (i) {
      const f = document.createElement("button");
      f.type = "button", f.className = "am-btn am-btn--peligro", f.textContent = u("toolbar.cancelar"), f.addEventListener("click", () => this.cancel()), e.appendChild(f);
    } else if (a.length > 0) {
      const f = document.createElement("button");
      f.type = "button", f.className = "am-btn am-btn--fantasma", f.textContent = u("toolbar.vaciar"), f.addEventListener("click", () => this.clear()), e.appendChild(f);
    }
  }
  campoSelect(e, a, r, i) {
    const s = document.createElement("label");
    s.className = "am-campo";
    const c = document.createElement("span");
    c.textContent = u(e);
    const d = document.createElement("select");
    for (const n of a) {
      const l = document.createElement("option");
      l.value = n.valor, l.textContent = n.etiqueta, l.selected = n.valor === r, d.appendChild(l);
    }
    return d.addEventListener("change", () => i(d.value)), s.append(c, d), s;
  }
  // ——— Lista con claves estables y virtualización condicional ———
  virtualActiva() {
    return this.estado.orden.length > this.config.virtualization.threshold;
  }
  renderizarLista() {
    if (!this.sombra || this.estructural.headless === !0) return;
    const e = this.ref("lista"), a = this.ref("notas"), r = this.estado.orden, i = this.sombra.querySelector('[data-ref="espaciador"]');
    for (const [n, l] of this.filas)
      r.includes(n) || (l.remove(), this.filas.delete(n));
    if (r.length === 0) {
      for (const [, l] of this.filas) l.remove();
      if (this.filas.clear(), !e.querySelector(".am-vacia")) {
        const l = document.createElement("li");
        l.className = "am-vacia", l.textContent = u("lista.vacia"), e.appendChild(l);
      }
      a.innerHTML = "", e.style.maxHeight = "", e.style.overflowY = "", e.style.position = "", i && (i.style.height = "0px"), i && (i.style.display = "none"), e.onscroll = null;
      return;
    }
    e.querySelector(".am-vacia")?.remove();
    const s = this.virtualActiva();
    if (a.innerHTML = "", s) {
      const n = document.createElement("div");
      n.className = "am-nota-virtual", n.textContent = u("lista.virtual"), a.appendChild(n);
    }
    const c = this.ventanaVisible(), d = (n, l) => {
      s ? (n.style.position = "absolute", n.style.top = `${l * this.config.virtualization.rowHeightPx}px`, n.style.left = "0", n.style.right = "0", n.style.height = `${this.config.virtualization.rowHeightPx}px`) : n.style.cssText = "", e.appendChild(n);
    };
    s ? (e.style.maxHeight = `${this.config.virtualization.maxHeightPx}px`, e.style.overflowY = "auto", e.style.position = "relative", i && (i.style.display = "", i.style.flex = "none", i.style.height = `${r.length * this.config.virtualization.rowHeightPx}px`, e.insertBefore(i, e.firstChild)), e.onscroll = () => this.renderizarLista()) : (e.style.maxHeight = "", e.style.overflowY = "", e.style.position = "", i && (i.style.height = "0px", i.style.display = "none"), e.onscroll = null);
    for (let n = c.inicio; n < c.fin; n++) {
      const l = r[n], p = this.estado.porId.get(l);
      let f = this.filas.get(l);
      f || (f = this.crearFila(), this.filas.set(l, f)), this.actualizarFila(f, p, n, s), d(f, n);
    }
    for (const [n, l] of this.filas) {
      const p = r.indexOf(n);
      s && (p < c.inicio || p >= c.fin) && l.remove();
    }
  }
  ventanaVisible() {
    if (!this.virtualActiva()) return { inicio: 0, fin: this.estado.orden.length };
    const e = this.ref("lista"), a = Yt({
      total: this.estado.orden.length,
      alturaFila: this.config.virtualization.rowHeightPx,
      overscan: this.config.virtualization.overscan,
      scrollTop: e.scrollTop,
      // clientHeight puede ser 0 antes del layout: cae al máximo configurado.
      alturaContenedor: e.clientHeight || this.config.virtualization.maxHeightPx
    });
    return { inicio: a.inicio, fin: a.fin };
  }
  crearFila() {
    const e = document.createElement("li");
    e.className = "am-fila", e.setAttribute("role", "listitem"), e.innerHTML = `
      <span class="am-fila__mango" data-ref-fila="mango">${I.mango}</span>
      <span class="am-fila__num" data-ref-fila="num"></span>
      <div class="am-fila__cuerpo">
        <span class="am-fila__nombre" data-ref-fila="nombre"></span>
        <span class="am-fila__meta" data-ref-fila="meta"></span>
      </div>
      <span data-ref-fila="chip"></span>
      <div class="am-fila__acciones">
        <button type="button" class="am-btn-icono" data-ref-fila="subir" data-accion="subir"></button>
        <button type="button" class="am-btn-icono" data-ref-fila="bajar" data-accion="bajar"></button>
        <button type="button" class="am-btn-icono" data-tipo="peligro" data-ref-fila="quitar" data-accion="quitar"></button>
      </div>`;
    const a = e.querySelector('[data-ref-fila="subir"]'), r = e.querySelector('[data-ref-fila="bajar"]'), i = e.querySelector('[data-ref-fila="quitar"]');
    return a.innerHTML = I.subir, r.innerHTML = I.subir, r.querySelector("svg").style.transform = "rotate(180deg)", i.innerHTML = I.quitar, a.addEventListener("click", () => this.accionFila(e, "subir")), r.addEventListener("click", () => this.accionFila(e, "bajar")), i.addEventListener("click", () => this.accionFila(e, "quitar")), e.addEventListener("dragstart", (s) => {
      this.idArrastrandose = e.dataset.id ?? null, e.dataset.origen = "true", s.dataTransfer?.setData("text/plain", e.dataset.id ?? ""), s.dataTransfer.effectAllowed = "move";
    }), e.addEventListener("dragend", () => {
      e.dataset.origen = "false", this.idArrastrandose = null, this.renderizarLista();
    }), e.addEventListener("dragover", (s) => {
      this.idArrastrandose !== null && (s.preventDefault(), e.dataset.sobre = "true");
    }), e.addEventListener("dragleave", () => {
      e.dataset.sobre = "false";
    }), e.addEventListener("drop", (s) => {
      if (s.preventDefault(), e.dataset.sobre = "false", s.dataTransfer?.files?.length) {
        this.addFiles(s.dataTransfer.files);
        return;
      }
      const c = this.idArrastrandose ?? s.dataTransfer?.getData("text/plain");
      if (!c || c === e.dataset.id) return;
      const d = this.estado.orden.indexOf(c), n = this.estado.orden.indexOf(e.dataset.id ?? "");
      if (d < 0 || n < 0) return;
      this.estado = x(this.estado, { tipo: "MOVER", de: d, a: n });
      const l = this.estado.porId.get(c);
      this.anunciar(u("a11y.movida", { nombre: l?.name ?? "", pos: n + 1 })), this.emitir(O.reordenado, { orden: [...this.estado.orden], de: d, a: n, origen: "arrastrar" }), this.renderizarLista();
    }), e;
  }
  accionFila(e, a) {
    const r = e.dataset.id ?? "";
    if (!r) return;
    if (a === "quitar") {
      this.removeTrack(r);
      return;
    }
    const i = a === "subir" ? -1 : 1, s = this.estado.orden.indexOf(r);
    try {
      this.estado = x(this.estado, { tipo: "MOVER_ID", id: r, delta: i });
    } catch {
      return;
    }
    const c = this.estado.porId.get(r);
    c && this.anunciar(u("a11y.movida", { nombre: c.name || u("pista.nombreVacio"), pos: this.estado.orden.indexOf(r) + 1 })), this.emitir(O.reordenado, { orden: [...this.estado.orden], de: s, a: this.estado.orden.indexOf(r), origen: "boton" }), this.renderizarLista(), e.querySelector(`[data-ref-fila="${a}"]`)?.focus();
  }
  actualizarFila(e, a, r, i) {
    e.dataset.id = a.id, e.dataset.estado = a.status, e.setAttribute("aria-roledescription", u("pista.numero", { n: r + 1 })), e.setAttribute("aria-label", `${u("pista.numero", { n: r + 1 })}: ${a.name || u("pista.nombreVacio")}`), e.draggable = !i;
    const s = e.querySelector('[data-ref-fila="num"]');
    s.textContent = String(r + 1);
    const c = e.querySelector('[data-ref-fila="nombre"]');
    c.textContent = a.name || u("pista.nombreVacio");
    const d = e.querySelector('[data-ref-fila="meta"]');
    d.textContent = [
      a.durationMs === null ? a.status === "analyzing" ? u("pista.analizando") : u("pista.duracionDesconocida") : $(a.durationMs),
      D(a.size),
      a.extension.toUpperCase()
    ].join(" · ");
    const n = e.querySelector('[data-ref-fila="chip"]');
    a.status === "invalid" ? (n.className = "am-chip", n.dataset.tipo = "invalid", n.textContent = u("pista.noUnible"), n.title = a.errorCode ?? "") : (n.className = "", n.removeAttribute("data-tipo"), n.textContent = "", n.removeAttribute("title"));
    const l = e.querySelector('[data-ref-fila="subir"]'), p = e.querySelector('[data-ref-fila="bajar"]'), f = e.querySelector('[data-ref-fila="quitar"]'), h = a.name || u("pista.nombreVacio");
    l.setAttribute("aria-label", u("pista.subir", { nombre: h })), p.setAttribute("aria-label", u("pista.bajar", { nombre: h })), f.setAttribute("aria-label", u("pista.quitar", { nombre: h })), l.disabled = r === 0, p.disabled = r === this.estado.orden.length - 1;
    const v = e.querySelector('[data-ref-fila="mango"]');
    v.setAttribute("aria-hidden", i ? "true" : "false"), i ? v.removeAttribute("title") : v.title = u("pista.mango", { nombre: h });
  }
  // ——— Estado / resultado / error / diálogo / anuncios ———
  renderizarEstado() {
    if (!this.sombra || this.estructural.headless === !0) return;
    const e = this.ref("estado-texto"), a = this.ref("progreso"), r = this.ref("progreso-barra"), i = this.estado.job, s = i?.status === "running";
    if (e.dataset.tono = this.estado.error && this.estado.error.code !== "USER_CANCELLED" ? "error" : this.estado.resultado ? "ok" : "normal", s && i) {
      const c = {
        "loading-engine": u("estado.motor", { pct: te(i.progress) }),
        probing: u("estado.sonda", { conocidos: i.trackIds.length }),
        merging: u("estado.uniendo", { pct: te(i.progress) }),
        validating: u("estado.validando")
      };
      e.textContent = c[i.stage] ?? u("estado.uniendo", { pct: te(i.progress) }), a.hidden = !1, r.style.width = `${Math.round(i.progress * 100)}%`, r.setAttribute("aria-valuenow", String(Math.round(i.progress * 100)));
    } else this.estado.resultado ? (e.textContent = u("estado.completado"), a.hidden = !0) : this.estado.error ? (e.textContent = this.estado.error.code === "USER_CANCELLED" ? u("estado.cancelado") : u("estado.error"), a.hidden = !0) : (e.textContent = "", a.hidden = !0);
    a.setAttribute("role", "progressbar"), a.setAttribute("aria-label", u("estado.progresoLabel")), a.setAttribute("aria-valuemin", "0"), a.setAttribute("aria-valuemax", "100");
  }
  renderizarResultado() {
    if (!this.sombra || this.estructural.headless === !0) return;
    const e = this.ref("resultado"), a = this.estado.resultado;
    if (e.innerHTML = "", !a) return;
    const r = document.createElement("div");
    r.className = "am-resultado";
    const i = document.createElement("div");
    i.className = "am-resultado__titulo", i.innerHTML = `${I.ok}<span></span>`, i.querySelector("span").textContent = u("resultado.titulo");
    const s = document.createElement("div");
    s.className = "am-resultado__meta", s.textContent = [
      `${u("resultado.duracion")}: ${a.durationMs === null ? u("resultado.duracionDesconocida") : $(a.durationMs)}`,
      `${u("resultado.tamano")}: ${D(a.size)}`,
      `${u("resultado.formato")}: ${Xt(a.mimeType)}`,
      a.strategy === "copy" ? u("resultado.estrategiaCopia") : u("resultado.estrategiaRecodificacion")
    ].join(" · ");
    const c = document.createElement("div");
    c.className = "am-resultado__acciones";
    const d = document.createElement("button");
    d.type = "button", d.className = "am-btn am-btn--primario", d.innerHTML = `${I.descargar}<span></span>`, d.querySelector("span").textContent = `${u("resultado.descargar")} · ${a.name}`, d.addEventListener("click", () => this.download());
    const n = document.createElement("button");
    if (n.type = "button", n.className = "am-btn am-btn--fantasma", n.textContent = u("resultado.otra"), n.addEventListener("click", () => this.reset()), c.append(d, n), r.append(i, s), a.warnings.length > 0) {
      const p = document.createElement("div");
      p.className = "am-avisos";
      for (const f of a.warnings) {
        const h = document.createElement("div"), v = "params" in f ? f.params : void 0, E = u(`avisoCodigo.${f.code}`, v);
        h.textContent = `⚠ ${E.startsWith("⟨falta texto") ? f.message : E}`, p.appendChild(h);
      }
      r.appendChild(p);
    }
    const l = document.createElement("audio");
    l.controls = !0, l.src = a.url, l.setAttribute("aria-label", u("resultado.preescucha")), r.append(c, l), e.appendChild(r);
  }
  renderizarError() {
    if (!this.sombra || this.estructural.headless === !0) return;
    const e = this.ref("error");
    e.innerHTML = "";
    const a = this.estado.error;
    if (!a || a.code === "USER_CANCELLED") return;
    const r = document.createElement("div");
    r.className = "am-error";
    const i = document.createElement("div");
    i.className = "am-error__titulo", i.textContent = this.mensajeDeError(a, !0);
    const s = document.createElement("div");
    s.className = "am-error__detalle", s.textContent = a.message;
    const c = document.createElement("div");
    c.className = "am-error__consejo", c.textContent = this.consejoDeError(a);
    const d = document.createElement("div");
    if (d.className = "am-error__codigo", d.textContent = `code: ${a.code}`, r.append(i, s, c, d), at.includes(a.code)) {
      const n = document.createElement("button");
      n.type = "button", n.className = "am-btn am-btn--fantasma", n.textContent = u("misc.reintentar"), n.addEventListener("click", () => {
        this.estado = x(this.estado, { tipo: "REINICIAR" }), this.renderizarError(), this.ejecutarUnion();
      }), r.appendChild(n);
    }
    e.appendChild(r);
  }
  renderizarDialogoAviso(e, a) {
    if (!this.sombra) return;
    const r = this.ref("dialogo");
    r.innerHTML = "";
    const i = document.createElement("div");
    i.className = "am-dialogo-fondo";
    const s = document.createElement("div");
    s.className = "am-dialogo", s.setAttribute("role", "alertdialog"), s.setAttribute("aria-modal", "true");
    const c = document.createElement("div");
    c.className = "am-dialogo__titulo", c.innerHTML = `${I.aviso}<span></span>`, c.querySelector("span").textContent = u("aviso.titulo");
    const d = document.createElement("div");
    d.className = "am-dialogo__cuerpo", d.textContent = u("aviso.cuerpo", {
      tamano: e === null ? "—" : D(e),
      duracion: a === null ? u("aviso.duracionDesconocida") : $(a)
    });
    const n = document.createElement("div");
    n.className = "am-dialogo__acciones";
    const l = document.createElement("button");
    l.type = "button", l.className = "am-btn am-btn--primario", l.textContent = u("aviso.continuar"), l.addEventListener("click", () => this.avisoResolver?.(!0));
    const p = document.createElement("button");
    p.type = "button", p.className = "am-btn am-btn--fantasma", p.textContent = u("aviso.cancelar"), p.addEventListener("click", () => this.avisoResolver?.(!1)), n.append(p, l), s.append(c, d, n), s.addEventListener("keydown", (f) => {
      if (f.key === "Escape") {
        f.preventDefault(), this.avisoResolver?.(!1);
        return;
      }
      if (f.key === "Tab") {
        f.preventDefault();
        const h = Array.from(s.querySelectorAll("button")), v = h.indexOf(document.activeElement), E = f.shiftKey ? v <= 0 ? h.length - 1 : v - 1 : v === h.length - 1 ? 0 : v + 1;
        h[E]?.focus();
      }
    }), i.appendChild(s), r.appendChild(i), l.focus();
  }
  cerrarDialogoAviso() {
    const e = this.sombra?.querySelector('[data-ref="dialogo"]');
    e && (e.innerHTML = ""), this.estado = x(this.estado, { tipo: "LIMPIAR_AVISO" });
  }
  anunciar(e) {
    this.sombra && (this.ref("anuncios").textContent = e);
  }
  devolverFoco(e) {
    const a = Math.min(e, this.estado.orden.length - 1), r = a >= 0 ? this.estado.orden[a] : void 0;
    if (!r) {
      this.ref("zona").focus();
      return;
    }
    this.filas.get(r)?.querySelector('[data-ref-fila="quitar"]')?.focus();
  }
  /** Parámetros de interpolación COMPLETOS a partir de err.details (sin fugas de {tokens}). */
  parametrosDeError(e) {
    const a = {}, r = e.details ?? {};
    if (typeof r.nombre == "string" && (a.nombre = r.nombre), a.nombre === void 0 && Array.isArray(r.nombres) && (a.nombre = r.nombres[0] ?? ""), typeof r.formato == "string" && (a.formato = r.formato), typeof r.extension == "string" && a.formato === void 0 ? a.formato = r.extension : typeof r.mimeType == "string" && a.formato === void 0 && r.extension === void 0 && (a.formato = r.mimeType), a.formato === void 0) {
      const i = typeof r.nombre == "string" ? r.nombre : Array.isArray(r.nombres) ? String(r.nombres[0] ?? "") : "", s = i.includes(".") ? i.slice(i.lastIndexOf(".") + 1) : "";
      s !== "" && (a.formato = s);
    }
    return typeof r.limite == "number" && (a.limite = D(r.limite)), typeof r.maximo == "number" && a.limite === void 0 && (a.limite = D(r.maximo)), typeof r.n == "number" && (a.n = r.n), typeof r.minimo == "number" && a.n === void 0 && (a.n = r.minimo), typeof r.maximo == "number" && a.n === void 0 && (a.n = r.maximo), typeof r.obtenidas == "number" && a.n === void 0 && (a.n = r.obtenidas), typeof r.duracion == "string" && (a.duracion = r.duracion), typeof r.total == "number" && a.duracion === void 0 && (a.duracion = $(r.total)), typeof r.detalle == "string" && (a.detalle = r.detalle), typeof r.atributo == "string" && (a.detalle = `atributo «${r.atributo}» con valor «${String(r.recibido ?? "")}»`), Array.isArray(r.problemas) && (a.detalle = r.problemas.join("; ")), Array.isArray(r.desconocidas) && (a.detalle = r.desconocidas.join(", ")), Array.isArray(r.issues) && (a.detalle = r.issues.map((i) => i.key).join(", ")), Array.isArray(r.nombres) && (a.nombres = r.nombres.join(", ")), a.nombres === void 0 && a.detalle === void 0 && (typeof r.n == "number" || typeof r.esperados == "number") && (a.nombres = `las ${String(r.n ?? r.esperados ?? "?")} pistas`), Array.isArray(r.formatos) && (a.formatos = r.formatos.join(", ")), a.formatos === void 0 && (a.formatos = K().map((i) => u(i.etiquetaKey)).join(", ")), a;
  }
  mensajeDeError(e, a) {
    const r = `error.${e.code}.mensaje`;
    return u(r).startsWith("⟨falta texto") ? a ? u("estado.error") : e.message : u(r, this.parametrosDeError(e));
  }
  consejoDeError(e) {
    return u(`error.${e.code}.consejo`).startsWith("⟨falta texto") ? "" : u(`error.${e.code}.consejo`, this.parametrosDeError(e));
  }
  /** Revoca una object URL si el entorno lo soporta (jsdom/SSR no la tienen). */
  revocarURL(e) {
    e && typeof URL.revokeObjectURL == "function" && URL.revokeObjectURL(e);
  }
  emitir(e, a) {
    this.dispatchEvent(new CustomEvent(e, { detail: a, bubbles: !0, composed: !0 }));
  }
}
function aa() {
  typeof customElements > "u" || customElements.get(Ie) || customElements.define(Ie, ta);
}
let Ne = !1;
function oa() {
  Ne && Fe("x.mp3", "") !== null || (P({ id: "mp3", extensions: ["mp3"], mimeTypes: ["audio/mpeg"], etiquetaKey: "formato.mp3" }), P({ id: "wav", extensions: ["wav"], mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave"], etiquetaKey: "formato.wav" }), P({ id: "ogg", extensions: ["ogg", "oga"], mimeTypes: ["audio/ogg", "application/ogg", "audio/vorbis"], etiquetaKey: "formato.ogg" }), P({ id: "m4a", extensions: ["m4a", "mp4"], mimeTypes: ["audio/mp4", "audio/m4a", "audio/x-m4a"], etiquetaKey: "formato.m4a" }), P({ id: "flac", extensions: ["flac"], mimeTypes: ["audio/flac", "audio/x-flac"], etiquetaKey: "formato.flac" }), ve({
    id: "mp3",
    etiquetaKey: "salida.mp3",
    mimeType: "audio/mpeg",
    extension: "mp3",
    codec: "libmp3lame",
    argsCodificacion: (t) => ["-c:a", "libmp3lame", "-b:a", `${t}k`, "-ar", "44100", "-ac", "2"],
    bitratesKbps: [128, 192, 320],
    bitratePorDefecto: 192,
    sampleRateHz: 44100,
    canales: 2,
    bytesPorSegundo: (t) => t !== null ? t * 1e3 / 8 : null,
    sniff: Ue,
    codecsNativosParaCopia: ["mp3"]
  }), ve({
    id: "wav",
    etiquetaKey: "salida.wav",
    mimeType: "audio/wav",
    extension: "wav",
    codec: "pcm_s16le",
    argsCodificacion: () => ["-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2"],
    bitratesKbps: null,
    bitratePorDefecto: null,
    sampleRateHz: 44100,
    canales: 2,
    bytesPorSegundo: () => 44100 * 2 * 2,
    sniff: Pe,
    codecsNativosParaCopia: ["pcm_s16le"]
  }), ne({ esquema: { key: "format", type: "enum", values: () => Z().map((t) => t.id) }, etiquetaKey: "toolbar.formato" }), ne({ esquema: { key: "bitrateKbps", type: "int", min: 32, max: 320, nullable: !0 }, etiquetaKey: "opcion.bitrate" }), Gt(), Ne = !0);
}
oa();
aa();
function la(t) {
  const o = Me(t), e = new Y(o);
  return {
    merge: (a, r, i) => je(a, r, {
      config: o,
      motor: e,
      planificador: He,
      validadorContenedor: (s, c) => {
        const d = Z().find((n) => n.id === c);
        return d ? d.sniff(s) : !1;
      },
      esquemasOpciones: Be(),
      ...i
    }),
    preload: () => e.ensureLoaded()
  };
}
export {
  se as ATRIBUTOS,
  ta as AudioMergerElement,
  ia as CODIGOS_ERROR,
  Q as DEFAULT_CONFIG,
  O as EVENTOS,
  m as MergeError,
  Y as MotorFfmpeg,
  Ie as NOMBRE_WEB_COMPONENT,
  sa as NO_RETRY_CODES,
  na as SNIFFERS,
  Qt as VERSION,
  Fe as buscarFormatoEntrada,
  Yt as calcularVentana,
  $t as comprobarSoporteNavegador,
  la as crearUnion,
  Ct as esCopiaElegible,
  _t as esFlac,
  Lt as esM4a,
  Ue as esMp3,
  At as esOgg,
  Pe as esWav,
  Be as esquemasOpcionesRegistradas,
  j as formatoSalida,
  K as formatosEntradaRegistrados,
  Z as formatosSalidaRegistrados,
  tt as isMergeError,
  Jt as leerDuracion,
  je as mergeTracks,
  Ge as nombreInterno,
  we as pareceOOM,
  dt as parseAtributo,
  lt as parseAtributos,
  qt as parsearDuracion,
  Ee as parsearLogSonda,
  He as planificarUnion,
  qe as postProcesosActivos,
  da as postProcesosRegistrados,
  it as problemasDeConfig,
  oa as registrarBuiltins,
  aa as registrarElemento,
  P as registrarFormatoEntrada,
  ve as registrarFormatoSalida,
  Gt as registrarFundido,
  ne as registrarOpcion,
  It as registrarPostProceso,
  ca as reiniciarRegistros,
  Tt as resolverBitrate,
  Me as resolverConfig,
  kt as resolverUrlsCore,
  C as toMergeError,
  st as validarConfig
};
