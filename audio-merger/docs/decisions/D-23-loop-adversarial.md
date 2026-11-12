# D-23 — Loop adversarial del rediseño: 3 rondas, 4/10 → 7/10 → 7,5 APROBADO

## Contexto
Continuación de D-22. El usuario exigió trabajar en loop (planifica→construye→
prueba→revisa→corrige→repite) con un árbitro que use técnicas adversariales
hasta una experiencia "pulida, original y digna de Awwwards". El árbitro fue
un subagente con acceso real al navegador (agent-browser + medición de
computed styles, contrastes WCAG calculados, shadow DOM, geometría) y orden
explícita de no confiar en la lista de correcciones: re-verificar cada punto.

## Ronda 1 — RECHAZADO 4/10 (15 hallazgos)
Críticos: CSS servido rancio (el watcher de `globals.css` no propagó la capa
custom — grano/ecualizador/marquee/hovers NO vivían en la página en vivo),
marquee con matemática de bucle rota (salto de 20px) y pista < 2×viewport,
Geist sin aplicar al body ni heredar al widget (toda la prosa en system-ui),
microinteracciones muertas por la misma caché. Medios: 5 contrastes AA
fallidos con valores calculados, targets táctiles <44px, retícula con tres
márgenes distintos, jerga dev residual en el widget («audio/mpeg»,
«re-codificado», consejos con atributos/CSP/README). Menores: punto colgado
del H1, baseline de pasos, año fijo, branding «Unión de audio» vs producto.

## Ronda 2 — APROBADO CON RESERVAS 7/10
13 de 15 corregidos y verificados con evidencia (incluida una unión real).
Regresión nueva detectada: botones de 44px en la cuadrícula de 5 columnas
dejaban 38px para el nombre de pista en móvil → «tono…» ilegible (N1).
Pendían: N1, N2 (marquee <2×2560), N3 (header ±12px), H11 parcial.

## Ronda 3 — APROBADO 7,5/10
N1: fila móvil reestructurada a 2 bandas (grid 28px+1fr × 2 filas, mango
oculto, acciones abajo) — nombre sin truncar (230px), botones 44px intactos.
N2: 12 bloques → pista 7.061px (desvío de bucle 0,03px). N3: header px-5.
H11: `.am-estado:has(> .am-estado__texto:empty){display:none}` (la regla
`:empty` ronda-3 fue hallazgo del árbitro: `.am-estado` SIEMPRE tiene hijo).
Remates propios: `text-wrap:balance` en H1, `Entrada:` en vez de «Tamaño de
entrada:» (totales 59→39px en móvil), transition del CTA sin animar el
outline (foco instantáneo), grano 0.055.

## Estado final verificado (navegador real)
- Unión de 3 pistas: «Duración: 0:07 · Tamaño: 166 KB · Formato: MP3 ·
  convertido al formato elegido», cero errores de consola, cero warnings de
  hidratación, móvil 390 sin desborde, footer pegado con safe-area.
- Librería: 192/192 tests, typecheck, UMD 29,0 KB gzip (presupuesto ≤30 KB).
- Contrastes: todos los pares medidos ≥4,5:1 (o AA-large en display).

## Lecciones registradas
1. El watcher de CSS de este entorno NO propaga ediciones de `globals.css`
   tras el arranque: reiniciar dev con `.next` limpio tras tocarlo (duplicar
   la verificación con curl al chunk servido).
2. En Web Components embebidos en HTML estático: registrar builtins ANTES
   de `customElements.define` (la carrera del upgrade renderiza con el
   registro vacío — ver D-22 punto 4).
3. Los screenshots full-page no disparan IntersectionObserver: para auditar
   contenido con reveals hay que hacer scroll real.

## Verificación definitiva pendiente (honestidad)
La ejecución fue verificada en Chromium headless real; no se ha probado en
los navegadores de los usuarios finales ni en producción (los hashes de
contenido de Next resuelven el asunto de caché de CSS por sí solos). El
«FAB N» que aparece en las capturas es el overlay de dev de Next.js: no
existe en producción.
