# FASE 2 — Modelado de datos

## Entidades (src/core/types.ts)

Todas con `id: UUID` generado (`utils/id.ts`, fallback v4 declarado no criptográfico) y
`createdAt` (ms). El `id` es la clave estable en TODA la app (lista, eventos, API) —
nunca el índice.

- **`AudioTrack`** `{ id, createdAt, name, size, mimeType, extension, durationMs|null,
  status: 'ready'|'analyzing'|'invalid', errorCode?, probed: ProbeInfo|null }`.
  - `durationMs: null` = **desconocida** (dato ausente conocido; la UI lo enseña, no lo inventa).
  - `errorCode` solo con `status === 'invalid'` (formato/tamaño/corrupta).
  - `probed` se rellena por la sonda del motor durante la unión (FASE 4).
- **`MergeJob`** `{ id, createdAt, trackIds (orden EXACTO), outputFormat, bitrateKbps,
  status: 'running'|'completed'|'error'|'cancelled', progress 0..1, stage, errorCode?,
  startedAt, finishedAt? }`.
- **`ProbeInfo`** `{ codec, sampleRateHz, channels, bitrateKbps|null, durationMs|null }`.

## Invariantes (se aplican en código puro y fallan rápido con MergeError)

1. **Orden estable**: `orden: string[]` es siempre permutación del anterior; `REORDENAR`
   rechaza listas que no lo sean (`INVALID_ORDER`).
2. **Ids únicos**: `ANADIR_PISTAS` rechaza duplicados; todo id de `orden` existe en `porId`.
3. **Mínimo de pistas**: `limits.minTracks` (2 por defecto) se comprueba antes de unir
   con `comprobarMinimoPistas` (`core/tracks.ts`) → `NOT_ENOUGH_TRACKS`;
   configurable.
4. **Máximos configurables**: por archivo (`maxFileBytes`), Σ entradas (`maxTotalBytes`),
   Σ duración (`maxDurationMs`, null = sin límite duro) — ver `core/estimacion.ts`.
5. **Las pistas `invalid` se excluyen de la unión sin tumbar la lista** (tolerancia por pista).

## Estructuras en memoria y complejidad (declarada)

| Estructura | Operación | Coste |
|---|---|---|
| `Map<id, AudioTrack>` + `orden: string[]` | añadir N | O(N) |
| id → pista | lookup | O(1) |
| reorden (MOVER/MOVER_ID) | splice + re-append de filas existentes | O(N) refs (sin recrear filas) |
| totales (duración/tamaño) | reducir la lista | O(N) |
| estimación previa | reducir la lista | O(N) |
| selección de unibles | filtrar `status==='ready'` | O(N) |

## Esquema de opciones extensible (Regla del Carro)

`MergeOptions` = campos base (`format`, `bitrateKbps`, `fadeMs`) + índice abierto para
opciones registradas por terceros. La validación es **declarativa**
(`core/validation.ts`): cada opción registra un `OptionSchema` (tipo, mínimo, máximo,
nulabilidad, valores de enum estáticos o dependientes de otras opciones). Las claves
desconocidas se **rechazan** (`INVALID_OPTIONS`), nunca se ignoran. Los valores por
defecto solo se aplican a claves ausentes — nunca para tapar un valor inválido.

## Migraciones

**No aplica en v1**: no hay persistencia (sin IndexedDB/localStorage). Estado en
memoria; al cerrar la pestaña se pierde (declarado en plan.md §2). Cuando exista
persistencia, las migraciones vivirán junto al esquema versionado.
