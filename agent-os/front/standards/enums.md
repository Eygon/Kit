---
name: enums
description: Enum location, one-per-file, mandatory Enum suffix, SCREAMING_SNAKE_CASE members, string-vs-numeric value choice, one representation per concept, and co-located guards/option-arrays/Record maps
metadata:
  type: project
---

# Enums

## Location & files

- Shared enums live in `src/types/enums/`, grouped by domain subfolder
  (`tabs/`, `param/`, `ticket/`, `planningEvent/`…).
- One enum per file; the file is camelCase, named after the enum:
  `permissionEnum.ts` → `PermissionEnum`.
- An enum used by a single feature is co-located with that feature, **not** in
  `src/types/enums/` — see `file-placement`. Example: `TicketHistoryPeriodEnum`
  in `createTicketPanel/utils/`.

## Naming — always suffix `Enum`

```ts
export enum ScreenCodeEnum { ... }   // ✅
export enum ScreenCode { ... }       // ❌ missing suffix
```

- Existing non-suffixed enums (`HttpStatusCode`, `ScreenCode`, `Lang`, `*Tabs`,
  `*Fields`) are legacy — rename to `*Enum` when you next touch them (rename the
  file and update every import).

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
`SwissFranc` → `SWISS_FRANC`, `IsKeyAccount` → `IS_KEY_ACCOUNT`.

The repo holds 55 legacy enums whose members are `PascalCase` — rename members and
file together when you next touch one. The enums that already use
`SCREAMING_SNAKE_CASE` (`HttpStatusCode`, `MonthEnum`, `*Tabs`, `*Fields`,
`*RecurrenceOption`…) are correct on casing; they separately still lack the `Enum`
suffix from the section above — fix both in the same pass.

## Casing of the *values*

- A value that is a backend or route contract is kept **verbatim**, whatever its
  casing — see `naming-language`.

  ```ts
  export enum ScreenPopBehaviorEnum { OPEN_ACCOUNT = "OpenDossier" }
  ```

- A value the frontend owns end to end is `camelCase`.

  ```ts
  export enum CommercialConsoleOfferTabEnum { IN_PROGRESS = "inProgress" }
  ```

## One representation per concept

Before adding an enum, grep for the concept: a same notion carried by a string
union in one folder, an enum in another and a bare `string` in a DTO is the
failure this rule prevents. Sort direction is the reference case — a single
`SortDirectionEnum` in `src/types/enums/table/`, and the UI-facing union derives
from it rather than restating it:

```ts
export enum SortDirectionEnum { ASCENDING = "asc", DESCENDING = "desc" }

export type SortDirection = `${SortDirectionEnum}`;
```

Deriving the union keeps interop with libraries that hand back raw literals
(TanStack Table's `getIsSorted()`) without a second source of truth.

## String vs numeric values

- **String enum** when the value *is* a contract or key — permission code,
  screen code, language, form field name, tab, storage key. The string carries
  the meaning and must match the backend/route contract verbatim (see
  `naming-language`).

  ```ts
  export enum PermissionEnum { HOME_ACCESS = "home_access" }
  export enum LangEnum { FR = "fr", EN = "en" }
  ```

- **Numeric enum** only for a *bounded, exhaustive* set of backend IDs — ticket
  statuses (1–5), months (0–11 to match JS `Date`).

  ```ts
  export enum TicketStatusIdEnum { IN_PROGRESS = 1, WAITING_CLIENT = 2 }
  ```

- A *single* backend ID cherry-picked from a large referential is a named
  constant, **not** a one-member enum — see `constants`.

  ```ts
  export const ACCOUNT_TYPE_ID_PRIVILEGE = 7;
  ```

## Co-locate derived data with the enum

Guards, option arrays, and `Record<Enum, X>` lookups live in the enum's file:

```ts
export const isKnownScreenCode = (value: string): value is ScreenCodeEnum =>
    Object.values(ScreenCodeEnum).includes(value as ScreenCodeEnum);

export const TICKET_HISTORY_PERIOD_OPTIONS: TicketHistoryPeriodEnum[] = [ ... ];

const PERIOD_DAYS: Record<TicketHistoryPeriodEnum, number> = { ... };
```
