# INFORME DE ARBITRAJE ADVERSARIAL — Fix de render de "Fusionador de Audio"

**Árbitro:** agente independiente (Task ID 25) · **Fecha:** 2026-11-13 · **Norma:** confía pero verifica TODO; intenta romperlo.
**Objeto:** el fix del bug "página casi vacía en el navegador del usuario" (SSR emitía 13 bloques con `style="opacity:0"` en línea de framer-motion; si el JS de cliente no ejecutaba, el contenido quedaba invisible para siempre).

---

## 1. Contexto auditado (afirmaciones del autor)

1. `src/components/reveal.tsx` reescrito como componente de servidor puro (sin `use client`, sin framer-motion): emite `<div class="reveal" style="--reveal-delay:Xs">`, 100% visible sin JS.
2. `src/app/globals.css`: reglas `.reveal` que solo se ocultan bajo `html.reveal-on` + `@media (prefers-reduced-motion: no-preference)`; `.reveal-in` devuelve la visibilidad (0.7s + delay); `:focus-within` muestra al instante (a11y teclado); bloque `reduce` fuerza `opacity:1`.
3. `src/app/layout.tsx`: micro-script inline `ARRANQUE_REVEAL` como primer hijo de `<body>`; añade `reveal-on` a `<html>` solo si hay IntersectionObserver y no hay `prefers-reduced-motion`; registra IO (rootMargin `0px 0px -64px 0px`, once). `<Toaster />` eliminado; favicon a `/logo.svg` local.
4. `src/components/landing.tsx`: fallback light-DOM dentro de `<audio-merger>`; `[text-wrap:pretty]`; línea de privacidad en footer.
5. `next.config.ts`: `allowedDevOrigins: ["*.space-z.ai"]`.
6. Servidor dev en puerto 3000.

## 2. Metodología

Cero mutaciones al proyecto (solo se escribió este informe). Verificación mecánica con: `curl` del SSR crudo, descarga y grep del CSS compilado, lectura de código fuente (`reveal.tsx`, `globals.css`, `layout.tsx`, `landing.tsx`, `next.config.ts`), `agent-browser` (rutas de red abortadas, eval JS, screenshots, viewport móvil, focus), **Playwright** con emulación real de `reducedMotion` (porque `agent-browser set media reduced` resultó ser un no-op — ver hallazgo 2), `md5sum`, `git diff` (lectura), `bun run lint`, `pgrep`, y auditoría visual con `z-ai vision` sobre screenshots propios.

**Nota de honestidad metodológica:** la primera auditoría visual (z-ai vision) fue INVALIDADA por un error de sonda mío: `agent-browser reload` restauraba la posición de scroll (1888px), así que las dos capturas (top/bottom) eran el mismo archivo (md5 idénticos) mostrando el fondo de la página. Se repitieron las capturas con `scrollTo(0,0)` explícito y se re-auditó. Las críticas de aquel primer informe ("H1 ausente, consola ausente") eran artefacto del error de sonda, no defectos de la página — refutado por geometría DOM (h1Top=210px, opacity 1).

## 3. Evidencia por ataque

### A. Sondeo SSR crudo — ✅ PASS

```
curl -s http://localhost:3000 | grep -c 'opacity:0'   → 0
<html lang="es">                                        → NO contiene reveal-on (solo lo añade JS)
offset <script> arranque = 2732   <   offset <header> = 3899   → el script va ANTES del contenido visible
grep 'class="reveal"' SSR → 13 bloques exactos (5 sin delay, 8 con --reveal-delay 0.08–0.3s)
CSS compilado (/_next/static/chunks/[root-of-the-server]__56062881._.css) contiene:
  html.reveal-on .reveal {opacity:0; transform:translateY(26px)}      [solo bajo no-preference]
  html.reveal-on .reveal.reveal-in {opacity:1; transition .7s … var(--reveal-delay,0s)}
  html.reveal-on .reveal:focus-within {opacity:1; transition:none; transform:none}
  @media (prefers-reduced-motion: reduce) { html.reveal-on .reveal {opacity:1; transform:none} }
```
El `<html>` del SSR no lleva `reveal-on`; las 2 ocurrencias de la cadena en el HTML son el propio literal del micro-script y su réplica en el payload RSC del final del stream (esperado). El micro-script es el primer hijo visible de `<body>` (tras un `<div hidden>` interno de Next), antes de que se pinte cualquier contenido.

### B. Navegador SIN JS de React — ✅ PASS

`agent-browser network route "**/_next/static/chunks/*.js" --abort` + open. Evidencia de que el bloqueo fue REAL: los 13 chunks de React/Next con `transferSize:0` y `responseStatus:0` en `performance.getEntriesByType('resource')`; el marcador de boot `body > div[hidden]` sigue presente (sin hidratación); no hay portal de devtools. Resultado:

```
revealCount: 13 · h1Text: "Une tus audiosen uno solo" · h1 opacity computada: "1" (tras ~1.5s)
revealOnHTML: true (el micro-script inline SÍ ejecutó — es inline, no módulo) · revealIn: 5 (los del hero, por el IO)
heroKicker/heroSub/cta1/cta2/pasosTitles/garantías/footer: todos presentes en el DOM
widgetUpgraded: true (el UMD de /audio-merger/ cargó pese al abort de /_next) · shadowRoot sin <slot> (el fallback deja de pintarse)
```
Sin React, con el inline-script vivo: contenido completo, hero visible, nada invisible. (Auditoría visual de esta captura: H1 bien renderizado, sin huecos ni overlays de error.)

### C. Sin JS TOTAL (simulado) — ✅ PASS

```
document.documentElement.classList.remove('reveal-on')
→ 13/13 .reveal con opacity computada "1", transform "none" en todos
```
Sin la clase, el CSS de ocultación no aplica a nada: sin JS la página se lee entera. El bug original (invisible para siempre) queda extinto por construcción.

### D. prefers-reduced-motion — ✅ PASS (vía Playwright; ver hallazgo 2)

`agent-browser set media reduced` NO emula nada (`matchMedia('(prefers-reduced-motion: reduce)').matches` → false; `set media dark` → true, el comando solo soporta color-scheme). Se verificó con Playwright `reducedMotion:'reduce'`:

```
mqReduce: true · revealOn: false (el micro-script hizo return temprano, como está declarado)
opacities: 13× "1" · anyTransform: 0 · marqueeAnim: "none" · eqAnim: "none" · scrollBehavior: "auto"
```
Escenario híbrido (usuario activa reduce DESPUÉS de cargar — clase reveal-on forzada a mano): `anyHidden: false, anyTransform: 0` — el bloque `reduce` del CSS fuerza la visibilidad aunque la clase esté. Doble protección confirmada.

### E. Teclado / focus-within — ✅ PASS

La regla `html.reveal-on .reveal:focus-within` existe en el CSS compilado servido (grep en el chunk .css). Prueba conductual sobre la página recién cargada, sin scroll:

```
#btn=cargar-ejemplos está dentro de un .reveal bajo el pliegue (top > innerHeight)
antes:  { revealIn: false, opacity: "0" }
btn.focus({preventScroll:true}) → focusActivo: true
después:{ opacity: "1", transform: "none" }   → se revela al instante, sin scroll
```
No se tabula sobre lo invisible. (Complemento: #pasos y #empezar tienen `scroll-margin-top:96px` > header 73px — los saltos de ancla no quedan bajo la cabecera sticky.)

### F. Ruta dorada del widget — ✅ PASS

```
click "Cargar 3 audios de ejemplo" → 3 pistas listadas en shadowRoot
aria-labels: "Subir/Bajar/Quitar tono-440-est.mp3", "…voz-sim.wav", "…tono-660.m4a" (+ "Unir audios", "Vaciar lista")
click "Bajar tono-440-est.mp3" → orden pasa a voz-sim.wav → tono-440-est.mp3 → tono-660.m4a  (orden cambiado ✓)
click "Unir audios" → 12s → shadowRoot contiene "Unión completada" y "Descargar" ✓
Duración total: 0:07 · 3 pistas · 417,2 KB de entrada (motor FFmpeg wasm funcionando)
```

### G. Regresiones — ✅ PASS con 1 hallazgo (ver 4.1)

```
bun run lint → exit 0, cero avisos
pgrep -af "next dev" → 2221/2222 vivos (HTTP 200 en /)
móvil 390×844 (scroll a fondo): footerBottom: 844 == innerHeight 844 · scrollWidth 390 == clientWidth 390 (sin overflow horizontal)
desktop 1280×720 (scroll a fondo): footerBottom: 720 == innerHeight 720 (footer pegado al final natural, no flotando) · pageHeight 2608
13 .reveal, y NINGÚN .reveal sin reveal-in dentro del viewport (sinInEnViewport: []) — nada visible queda oculto
```
Tras cada recarga con JS vivo: cero errores de consola excepto **el hallazgo 4.1** (advertencia de hidratación, dev-only).

### H. Contratos intactos — ✅ PASS

```
md5 public/audio-merger/audio-merger.umd.js == md5 audio-merger/dist/audio-merger.umd.js == bdea4e3cc5925e13e0f2fd4ccce24590
mtime del paquete widget: 21:54 (anterior al fix: 23:19–23:25) → el fix NO tocó el widget
SSR: <audio-merger role="region" aria-label="…" theme="dark" engine-base="/ffmpeg" locale="es" format="mp3" bitrate="192">
SSR: <script src="/audio-merger/audio-merger.umd.js" defer="">
samples: /samples/tono-440-est.mp3 · /samples/voz-sim.wav · /samples/tono-660.m4a → HTTP 200 (los 3)
git diff: - icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg"  + icon: "/logo.svg"  (favicon ya no sale del equipo)
git diff: - import { Toaster } …  - <Toaster />  (eliminado; /logo.svg y /ffmpeg/core existen en public/)
```
Chunks de cliente solicitados por la página: solo internals de Next/React + `src_app_layout_tsx` + `global-error` (builtin) — **ni framer-motion, ni sonner, ni subtree cliente de la app**. La página es ahora un árbol de servidor puro.

### I. Estilo/visuales finales — ✅ PASS (con matiz)

Capturas correctas (top tras 2.5s con `scrollTo(0,0)` explícito; fondo tras scroll 1.8s). Auditoría `z-ai vision` sobre ambas: H1 "Une tus audios / en uno solo" completo, nítido, buen contraste ✓; footer apoyado de forma natural al fondo ✓; bloque de garantías sin desbordes ✓; sin texto cortado ni solapamientos ✓; sin bloques vacíos ni contenido invisible (también en la captura sin-React) ✓. El modelo marcó: (a) badge dev "1 Issue" → es el hallazgo 4.1 (dev-only); (b) "pasos tragados por la cabecera fija" → refutado: es el overlay estándar de un header sticky y los anclas llevan `scroll-mt-24` (96px > 73px); (c) "hueco antes del footer" → padding de diseño (`pb-16/24`), cosmético; (d) "cinta de formatos no visible" → geometría: a 720px de alto la cinta queda bajo el pliegue (existe y funciona, verificado en B y en DOM `.marquee-pista`); (e) "© 2026" → `new Date().getFullYear()` con reloj del sandbox en 2026, no es un bug.

## 4. Hallazgos

**4.1 — MENOR (único defecto real, dev-only): advertencia de hidratación por `reveal-in` pre-hidratación.**
El IO del micro-script añade `reveal-in` a los `.reveal` visibles ANTES de que React hidrate → React 19 emite en dev:
`[error] A tree hydrated but some attributes of the server rendered HTML didn't match the client properties…` con diff `+ className="reveal"` / `- className="reveal reveal-in"` (5 elementos al cargar). Provoca el badge "1 Issue" del overlay de devtools. **Funcionalmente benigno — verificado por sonda temporal continua**: el `className` se mantiene `"reveal reveal-in"` en 6 muestras (t=1.1s→3.4s) a través de la hidratación y tras múltiples recargas/HMR; la opacity del h1 completa a "1"; React no revierte la clase ("won't be patched up") y jamás re-escribe un atributo con props constantes. En producción no hay overlay y los attribute-mismatch no rompen nada (el DOM queda como está). Riesgo teórico residual — que una re-renderización de React resetease `className` y dejase el bloque oculto para siempre (el IO ya lo des-observó) — quedó **refutado empíricamente**. Remedio fácil para el autor: `suppressHydrationWarning` en cada `<div className="reveal">`, o retrasar el alta de `reveal-in` a post-hidratación. No bloquea.

**4.2 — MENOR (herramienta de auditoría, NO del fix): `agent-browser set media reduced` es un no-op.**
Acepta el comando pero no emula `prefers-reduced-motion` (matchMedia false; `set media dark` sí funciona para color-scheme). El ataque D se verificó con Playwright (`reducedMotion:'reduce'`) con emulación real. Documentado para futuros árbitros: no usar `set media reduced` como evidencia.

**4.3 — NO VERIFICADO: `allowedDevOrigins: ["*.space-z.ai"]`.**
Desde este sandbox no hay forma de reproducir el proxy de preview (*.space-z.ai) ni su aviso cross-origin. Lo verificado: la config es sintáctica y semánticamente válida y el dev server arranca y sirve con ella (HTTP 200). El efecto concreto sobre el aviso queda sin evidencia — declarado honestamente.

**4.4 — Observaciones (sin defecto):** overlay del header sticky sobre el contenido al hacer scroll (patrón estándar, anclas con `scroll-mt-24`); espacio `pb-16/24` antes del footer (padding de diseño); cinta y consola bajo el pliegue en viewport 720px (geometría normal); restauración de scroll al recargar (comportamiento del navegador, provocó mi error de sonda inicial).

## 5. Veredicto

### **APROBADO CON RESERVAS**

El objetivo central del fix está **probado, no declarado**: la página ya no puede quedar invisible sin JS — verificado por cuatro vías independientes (SSR sin `opacity:0` en línea; chunks de React abortados con hero completo y opacity 1; remoción de `reveal-on` con 13/13 visibles; emulación real de reduced-motion con y sin clase). El orden script→contenido en el body es correcto, la a11y de teclado funciona, la ruta dorada del widget funciona de punta a punta, los contratos del widget están intactos (md5, atributos, samples, favicon local, Toaster fuera) y no hay regresiones de lint, servidor, móvil ni de footer. La única reserva es el hallazgo 4.1: una advertencia de hidratación dev-only introducida por el fix (ruido en consola + badge "1 Issue" en dev), funcionalmente benigna pero que conviene limpiar (`suppressHydrationWarning` en los `.reveal` o alta de `reveal-in` post-hidratación). El hallazgo 4.3 queda como no verificado por límite del sandbox, no por defecto del fix.
