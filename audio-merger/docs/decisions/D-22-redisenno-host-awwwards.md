# D-22 — Rediseño del host web a nivel Awwwards (landing papel/bosque/menta)

## Problema que resuelve
El usuario declaró la landing funcional pero "visualmente pésima": pidió borrar
todo lo marcado en una captura (badge «Librería libre · sin servidor ·
WebAssembly», chip «28 KB gzip», párrafos sobre «embed real», «addFiles()»,
sección «Por qué es distinto», «Embébelo en cualquier web», «Límites
prácticos», selftest, footer técnico) y exigir un loop
planifica→construye→prueba→corrige con árbitro adversarial hasta una
experiencia «pulida, original y digna de Awwwards».

## Decisión
1. **Contenido**: la landing pasa de «documento de librería» a «herramienta
   de usuario». Cero jerga dev visible en el estado por defecto. Se
   conservan: hero, la consola `<audio-merger>` (protagonista), 3 pasos
   (Añade/Ordena/Descarga), garantías (privado/5 formatos/gratis), footer
   mínimo. El README/ docs de la librería conservan toda la información
   técnica que se retiró de la vista.
2. **Identidad**: papel cálido #f8f5ee, tinta #132019, menta #0e8a62 (+
   `menta-tinta` #0b6a4c para AA en textos pequeños), bosque #0c1f16,
   Fraunces (display, itálica real) + Geist (cuerpo) + Geist Mono (eyebrows),
   grano de papel SVG, cinta de formatos en marquee, onda ecualizadora CSS,
   reveals framer-motion con `prefers-reduced-motion`.
3. **Widget**: `estilos.ts` reescrito — light = papel; dark = consola bosque
   (#0d1712) con acento #3ed598 y botón primario texto-oscuro; fuente del
   host vía `var(--am-font)` (cruza el shadow DOM); radios 20px; focos
   visibles; targets táctiles 44px. Presupuesto intacto: UMD 28,8 KB gzip.
4. **Carrera del upgrade (bug latente encontrado por el loop)**: el HTML
   estático del host ya contiene `<audio-merger>`; al ejecutarse el UMD,
   `customElements.define` upgradea el elemento y su primer render leía el
   registro de formatos VACÍO porque `registrarElemento()` corría antes que
   `registrarBuiltins()` en `index.ts`. Síntoma: «Formatos admitidos: ·».
   Fix: invertir el orden (builtins primero). Tests ajustados (192/192).
5. **Hallazgos del árbitro adversarial aplicados**: CSS servido rancio
   (dev server reiniciado con `.next` limpio), marquee con matemática de
   bucle rota (8 bloques + `padding-right` = mitad exacta), Geist sin
   aplicar al body (regla explícita en `@layer base`), 5 contrastes AA
   corregidos con valores calculados, MIME→etiqueta («MP3» en vez de
   «audio/mpeg»), jerga residual purgada de errores/estado del i18n,
   branding «Fusionador de audio» unificado, © año dinámico, baseline de
   pasos, retícula unificada a max-w-5xl.

## Alternativas descartadas
- TailwindPlay/formularios: plantillas genéricas; la identidad pedido a mano
  (papel + serif) es lo que evita el look «generado».
- Dark mode conmutable: la página es una herramienta de un uso; modo oscuro
  duplicaría superficie de prueba sin petición del usuario.
- Overrider variables del widget desde el host: imposibles (declaradas en
  `.am-root` dentro del shadow); la vía correcta es la fuente del componente.

## Coste
+~0,3 KB gzip en el UMD (restyle); +1 fuente display (Fraunces) en el host;
dev loop extra por el reinicio del servidor (el watcher no propagó la capa
custom de `globals.css` — documentado para el futuro: tras editar CSS de
raíz, reiniciar dev con `.next` limpio).

## Verificación
- Linux: 192/192 tests de la librería, typecheck, lint Next, build
  reproducible, gzip ≤ 30 KB, CSS servido inspeccionado (marquee/grain/eq/
  --am-font presentes tras reinicio).
- Navegador real (agent-browser): formatos completos, cargar 3 ejemplos,
  reorden por API, unión completa con resultado «Formato: MP3 · convertido
  al formato elegido», sin errores de consola, móvil 390 sin desborde,
  táctiles ≥44px, eyebrow en una línea.
- Árbitro adversarial en dos pasadas; ver D-23 para la re-evaluación final.
