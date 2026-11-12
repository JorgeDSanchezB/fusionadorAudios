# D-10 — Icono del ejecutable generado programáticamente

## Problema que resuelve
Identidad visual propia sin depender de assets de terceros (licencias/procedencia).

## Decisión
`tools/genicon` dibuja un icono «ondas de audio uniéndose» (paleta teal/ámbar, sin
azules) y emite icon.ico con tamaños 16/32/48/64/128/256 (BMP clásico hasta 48 y
PNG para ≥64).

## Coste introducido
- Diseño simple (declarado).

## Alternativas descartadas
- **Descargar .ico de stock**: procedencia/licencia poco trazable.
- **Sin icono**: el Explorador mostraría el genérico — mala presentación.
