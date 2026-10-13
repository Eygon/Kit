---
name: enums
description: Enum location, one-per-file, mandatory Enum suffix, SCREAMING_SNAKE_CASE members, string-vs-numeric value choice, one representation per concept, and co-located guards/option-arrays/Record maps
metadata:
  type: project
---

# Enums

## Location & files

- Shared enums live in `src/types/enums/`, grouped by domain subfolder
  (`http/`, `routing/`, `storage/`, `user/`…).
- One enum per file; the file is camelCase, named after the enum:
  `routePathEnum.ts` → `RoutePathEnum`.
- An enum used by a single feature is co-located with that feature, **not** in
  `src/types/enums/` — see `file-placement`. Example: a `TastingSortEnum` used only by the
  journal lives in `src/pages/journal/types/`.

## Naming — always suffix `Enum`

```ts
export enum RoutePathEnum { ... }   // ✅
export enum RoutePath { ... }       // ❌ missing suffix
```

## Member casing — always `SCREAMING_SNAKE_CASE`

```ts
export enum SortDirectionEnum { ASCENDING = "asc" }   // ✅
export enum SortDirectionEnum { Ascending = "asc" }   // ❌ PascalCase
export enum SortDirectionEnum { ascending = "asc" }   // ❌ camelCase
```

A member is a fixed, named constant of a closed set — `SCREAMING_SNAKE_CASE` says
so at the call site the same way `constants` does for a `const` export. `PascalCase`
reads like a type or a class, which an enum member is not.

Multi-word members split on every casing boundary: `InProgress` → `IN_PROGRESS`,
`IndiaPaleAle` → `INDIA_PALE_ALE`.

## Casing of the *values*

- A value that is a backend or route contract is kept **verbatim**, whatever its
  casing — see `naming-language`.

  ```ts
  export enum RoutePathEnum { MAP = "/carte", PROFILE = "/profil" }
  ```

- A value the frontend owns end to end is `camelCase` (or namespaced for storage:
  `StorageKeyEnum.CURRENT_USER_ID = "mousse.currentUserId"`).

## One representation per concept

Before adding an enum, grep for the concept: a same notion carried by a string
union in one folder, an enum in another and a bare `string` in a DTO is the
failure this rule prevents. When a library wants raw literals, derive the union from the
enum rather than restating it:

```ts
export enum SortDirectionEnum { ASCENDING = "asc", DESCENDING = "desc" }

export type SortDirection = `${SortDirectionEnum}`;
```

## String vs numeric values

- **String enum** when the value *is* a contract or key — route path, storage key,
  language, form field name, backend status string. The string carries the meaning and
  must match the contract verbatim (see `naming-language`).

  ```ts
  export enum StorageKeyEnum { CURRENT_USER_ID = "mousse.currentUserId" }
  export enum LanguageEnum { FR = "fr", EN = "en" }
  ```

- **Numeric enum** only for a *bounded, exhaustive* set of backend IDs or codes — the
  seeded demo users, HTTP statuses.

  ```ts
  export enum DemoUserIdEnum { ALICE = 1, BOB = 2, CAROL = 3 }
  ```

- A *single* backend ID cherry-picked from a large referential is a named
  constant, **not** a one-member enum — see `constants`.

## Co-locate derived data with the enum

Guards, option arrays, defaults and `Record<Enum, X>` lookups live in the enum's file
(`src/types/enums/user/demoUserIdEnum.ts`):

```ts
export const DEFAULT_DEMO_USER_ID = DemoUserIdEnum.ALICE;

export const DEMO_USER_OPTIONS: readonly { id: DemoUserIdEnum; labelKey: string }[] = [
  { id: DemoUserIdEnum.ALICE, labelKey: "pages.profile.demoUser.users.alice" },
];

export const isDemoUserId = (value: unknown): value is DemoUserIdEnum =>
  typeof value === "number" && Object.values(DemoUserIdEnum).includes(value);
```

A `Record<XEnum, …>` declared anywhere else is flagged by the mechanical check.
