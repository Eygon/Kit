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
| A single page/feature (≥2 of its files) | that page's matching subfolder — `src/pages/<page>/{components,hooks,types,utils}/` |
| Several pages / generic | top-level — `src/{components,hooks,types,utils,constants}/` (data hooks: `src/hooks/<domain>/`) |

Examples from this repository:
- `getTabBarItemClasses` is used only by `TabBarItem` →
  `src/components/elements/tabBarItem/utils/getTabBarItemClasses.ts`.
- `useCurrentUser` is used only by the profile page → `src/pages/profile/hooks/useCurrentUser.ts`,
  NOT `src/hooks/`.
- `DemoUserSelectProps` belongs to a profile widget → `src/pages/profile/types/demoUserSelect.ts`.
- `PageHeader`, used by the four pages → `src/components/elements/pageHeader/`, its props in
  `src/types/components/pageHeader.ts`.

Rules:
- Do NOT default anything to top-level `src/` by reflex. Default to the narrowest scope.
- Promote up exactly one level the moment a second wider consumer appears; never reach
  down into another component's or page's folder.
- The model/dto/mapper triad stays together at whatever scope it sits.

## Exception — the API data layer stays top-level by domain

The data layer for an API-bound domain lives at top-level keyed by domain, regardless of
how many pages consume it today. It is shared, framework-agnostic plumbing and the place a
second consumer will reach for. It covers:

- model/dto/mapper triad — `src/types/models/<domain>/`, `src/types/dtos/<domain>/`, `src/types/mappers/<domain>/`
- API service — `src/api/<domain>/<domain>Service.ts`
- URL builders — `src/utils/apiURL/apiURL.ts`
- query-key factory — `src/utils/queryKeys/<domain>QueryKeys.ts`
- query functions — `src/utils/queryFunctions/<domain>QueryFunctions.ts`

Only the React bindings (components, hooks) follow the narrowest-scope rule. A
`useBeersQuery` consumed only by the encyclopedia lives in `src/pages/encyclopedia/hooks/`
even though it wraps the top-level `BeerService` — the hook follows scope, the data layer it
wraps does not.

Why the layer itself does not move: a top-level service imports its model/dto/mapper, and a
query-key factory (`beerKeys`) is imported by hooks of several pages (the encyclopedia lists
beers, the journal links a tasting to a beer). Pushing it into one page would invert the
dependency (top-level → page) and break sharing.

## Tests

The mirror test follows the source wherever it lands: `src/X/y.ts` →
`src/__tests__/X/y.test.ts` (see `testing/testing-patterns`).
