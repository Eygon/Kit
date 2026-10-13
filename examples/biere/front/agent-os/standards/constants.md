---
name: constants
description: SCREAMING_SNAKE_CASE with unit suffixes (_MS/_PX), as const/readonly literals, xxxConstants.ts files, and named backend IDs with required JSDoc trace
metadata:
  type: project
---

# Constants

## Files & location

- A constants file is `xxxConstants.ts` (concatenated): `tabBarConstants.ts`,
  `timeConstants.ts`, `uploadConstants.ts`.
- Placement follows `file-placement`: shared → `src/constants/` (`src/constants/tabBarConstants.ts`),
  feature-local → that feature's `utils/`.
- Never the dot form (`createTastingDrawer.constants.ts`).

## Naming & units

- Every constant export is `SCREAMING_SNAKE_CASE`.
- Carry the unit in the name: durations end in `_MS`, pixel values in `_PX`, sizes in
  bytes in `_BYTES`.

```ts
export const SEARCH_DEBOUNCE_MS = 300;
export const PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
```

## `as const` & readonly

- Object/tuple literals, and string literals that feed a type, use `as const`.
- Shared arrays are typed `readonly T[]`.

```ts
export const DEFAULT_MAP_CENTER = { latitude: 45.764, longitude: 4.8357 } as const;

export const TAB_BAR_ENTRIES: readonly TabBarEntry[] = [
  { to: RoutePathEnum.ENCYCLOPEDIA, labelKey: "nav.encyclopedia", icon: BookOpen },
];
```

## Backend magic IDs

- Never inline a backend ID at a call site. Extract it to a `SCREAMING_SNAKE_CASE`
  constant naming what the ID *means* (`BEER_STYLE_ID_SAISON`, not `7`).
- A JSDoc tracing the backend source is **required** whenever one exists, and is the
  **only** sanctioned exception to the no-comments rule. It states the ID's meaning and
  where it is defined (seed, table).

```ts
/** Id of the "Saison" beer style. Backend reference: DataSeeder, beer_style.id = 7. */
export const BEER_STYLE_ID_SAISON = 7;
```

- A *bounded* set of related backend IDs is a numeric enum instead — see `enums`
  (`DemoUserIdEnum` for the three seeded users).
