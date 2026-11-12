# D-24 — SSR siempre visible: el reveal deja de depender del JS del cliente

**Estado:** aplicado y verificado (2026-11-12).
**Contexto:** el usuario abrió la web en su navegador Windows y vio la página
prácticamente vacía: cabecera y cinta de formatos visibles, hero/consola/secciones
invisibles («¿pero qué mierda es esto?»).

## Diagnóstico

El SSR de la landing emitía **13 bloques con `style="opacity:0"` en línea** — el
`initial` de framer-motion serializado en el HTML. El contenido solo recuperaba la
visibilidad si el bundle del cliente (React + framer-motion, chunks de turbopack)
**llegaba a ejecutarse por completo**. En el navegador del usuario eso no ocurría
(modulos lentos/antiguos/bloqueados): hidratación que nunca completa ⇒ 13 bloques
invisibles para siempre. Las únicas piezas que se veían eran las que NO estaban
envueltas en `Reveal` (cabecera, cinta) — coincide 1:1 con la captura del usuario.

Evidencia: `curl -s localhost:3000 | grep -c 'opacity:0'` → **13** (antes) / **0** (ahora).

## Decisión

1. **`Reveal` pasa a componente de servidor puro** (sin `use client`, sin
   framer-motion): emite `<div class="reveal" style="--reveal-delay: Xs">` — el HTML
   que llega al navegador es 100% legible sin JS.
2. **La animación es CSS + un micro-script inline de arranque** colocado como primer
   hijo del `<body>` (se ejecuta antes de que el navegador pinte cualquier contenido,
   así nunca hay flash): si `IntersectionObserver` existe y no hay
   `prefers-reduced-motion`, marca `<html class="reveal-on">` y registra el IO que
   añade `.reveal-in` al entrar en viewport (`rootMargin -64px`, `once`). La ocultación
   SOLO existe bajo `html.reveal-on` + `@media (prefers-reduced-motion: no-preference)`.
   Sin JS / con JS roto / con reduce: NADA se oculta, todo se lee.
3. **Endurecimientos**: `:focus-within` muestra al instante un bloque oculto si el
   foco del teclado entra en él (nunca se tabula sobre lo invisible); bloque
   `prefers-reduced-motion: reduce` fuerza `opacity: 1` (cinturón y tirantes);
   `suppressHydrationWarning` en el wrapper (el IO puede ganar a la hidratación —
   aviso de React 19 silenciado, hallazgo 1 del árbitro).
4. **Se elimina `<Toaster />`** del layout (nadie usa toasts en esta página) ⇒ la
   página queda sin componentes cliente propios: el único JS con peso es el UMD del
   widget, independiente de React.
5. **Fallback light-DOM dentro de `<audio-merger>`**: si el navegador no logra
   ejecutar el UMD, en vez de un hueco vacío aparece una tarjeta oscura que explica
   qué necesita (JS activo / navegador actual). El widget crea shadow root sin
   `<slot>`, así que al upgradear el fallback deja de pintarse solo.
6. `allowedDevOrigins: ["*.space-z.ai"]` en next.config (aviso cross-origin del
   proxy de preview silenciado). Favicon local `/logo.svg` (antes CDN externo —
   incoherente con «nada sale de tu equipo»).

## Qué NO cambia

- El paquete del widget no se toca (md5 público == dist, verificado por el árbitro).
- Contrato intacto: `mergeTracks`, eventos `audiomerger:`, WORKERFS, presupuesto
  ≤ 30 KB gzip del bundle del widget.
- La estética Awwwards de la landing (D-22) se mantiene; solo cambia el motor del
  reveal (misma curva: 26px + 0.7s + cubic-bezier(.22,1,.36,1) + delays escalonados).

## Verificación (resumen; detalle en INFORME_ARBITRO_FIX_RENDER.md)

- SSR: 0 × `opacity:0` en línea; script de arranque antes del `<header>`.
- Con los 13 chunks de React abortados: página completa + animada + widget funcional.
- Sin JS total (clase nunca puesta): 13/13 visibles estáticos.
- Reduced-motion (Playwright real): sin clase, sin transform, todo visible.
- Teclado: foco en bloque oculto → visible al instante.
- Ruta dorada: ejemplos → reordenar («Bajar») → «Unir audios» → «Unión completada ·
  Descargar audio-unido-….mp3».
- Móvil 390×844: sin overflow horizontal, footer exactamente a 844.
- `bun run lint` limpio; consola del navegador sin avisos de hidratación ni errores.
- Árbitro adversarial (Task 25): **APROBADO CON RESERVAS**; única reserva real
  (aviso de hidratación dev-only) corregida tras el veredicto y re-verificada.
