---
name: file-placement
description: Canonical rule for where any file lives — place every artifact (component, hook, type/dto/mapper, util) at the narrowest scope that consumes it, promote only on a wider second consumer
metadata:
  type: project
---

# File Placement — narrowest scope of consumption

This is the single, canonical rule for placing ANY artifact in the codebase:
components, hooks (including TanStack `useQuery` / `useMutation` data hooks), types
(model/dto), mappers, and utils. Place each file at the narrowest scope that actually
consumes it. Promote it up a level only when a second consumer at a wider scope appears.

| Consumed by… | Place it in… |
|---|---|
| A single component | that component's own folder — `src/components/<level>/<comp>/` (or `src/pages/<page>/components/<level>/<comp>/`) |
| A single page/feature (≥2 of its components) | that page's matching subfolder — `src/pages/<page>/{components,hooks,types,utils}/` |
| Several pages / generic | top-level — `src/{components,hooks,types,utils}/` (data hooks: `src/hooks/<domain>/`) |

Examples:
- A sub-component used only by `favoriteReasonForm` → `.../favoriteReasonForm/favoriteReasonFormSkeleton.tsx`.
- A `useXQuery` hook consumed by one page → `src/pages/<page>/hooks/`, NOT `src/hooks/<domain>/`.
- A model/dto/mapper used by one page → that page's `types/` + `utils/`, NOT `src/types` + `src/utils`.

Rules:
- Do NOT default anything to top-level `src/` by reflex. Default to the narrowest scope.
- Promote up exactly one level the moment a second wider consumer appears; never reach
  down into another component's folder.
- The model/dto/mapper triad stays together at whatever scope it sits.

## Exception — the API data layer stays top-level by domain

The data layer for an API-bound domain lives at top-level keyed by domain, regardless of
how many pages consume it today. This is deliberate: it is shared, framework-agnostic
plumbing and the place a second consumer will reach for. It covers:

- model/dto/mapper triad — `src/types/models/<domain>/`, `src/types/dtos/<domain>/`, `src/types/mappers/<domain>/`
- API service — `src/api/<domain>/`
- query-key factory — `src/utils/queryKeys/<domain>QueryKeys.ts`
- query functions — `src/utils/queryFunctions/<domain>QueryFunctions.ts`

Only the React bindings (components, hooks) follow the narrowest-scope rule. A `useXQuery`
hook that wraps this layer is placed by scope: a hook consumed by a single page lives in
that page's `hooks/` folder even if it wraps a top-level service — the hook follows scope,
the data layer it wraps does not.

Why the layer itself does not move: a top-level service (`src/api/<domain>/`) imports its
model/dto/mapper, and a shared query-key factory (e.g. `ticketKeys`, also used by
`useTicketQuery`) is imported by hooks in several places. Pushing those into one page would
invert the dependency (top-level → page) and break sharing. So the layer stays top-level by
domain; only its React-binding hooks relocate to the consuming page.
