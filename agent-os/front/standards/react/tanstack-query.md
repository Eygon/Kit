---
name: tanstack-query
description: TanStack Query conventions — file triad, query key factory, queryTimes with the cache category fixed per domain, hook naming
metadata:
  type: project
---

# TanStack Query Conventions

## File Triad per Domain

```
src/utils/queryKeys/<domain>QueryKeys.ts           — key factory       (shared data layer)
src/utils/queryFunctions/<domain>QueryFunctions.ts — fetcher functions (shared data layer)
use<Domain>Query.ts                                — useQuery hook      (placed by scope, see below)
```

The key factory and query functions are framework-agnostic data plumbing and always
live in the shared `src/utils/query*` layer, keyed by domain. The `useQuery` /
`useMutation` hook itself is placed by scope (feature folder for a single-page hook,
`src/hooks/<domain>/` only when a second page consumes it) — see the canonical
`file-placement` standard.

Exception — a query function that maps the result into a **page-specific shape** (not a
domain model/DTO) stays at the consuming feature's `utils/`, not the shared layer: hoisting
it top-level would invert the dependency (`src/utils` → a page type), which `file-placement`
forbids. The shared `queryFunctions` layer is for fetchers returning domain models/DTOs.
(`fetchAdvancedFolderSearchParameters` returns a feature `...Options` shape, so it lives in
that feature's `utils/`.)

## Query Keys

Factory pattern with `all` and `list`:
```ts
export const offerTypeKeys = {
  all: (company: string) => ["offerTypes", company] as const,
  list: (company: string) => [...offerTypeKeys.all(company), "list"] as const
};
```

## staleTime / gcTime

Always use `queryTimes` from `@config/tanstackQuery` — never hardcode durations.

| Category | staleTime | gcTime |
|----------|-----------|--------|
| `default` | 0 | 5 min |
| `short` | 30s | 5 min |
| `long` | 15 min | 1h |
| `infinite` | ∞ | ∞ |

## Category per domain

Which category a query takes is fixed per domain — do not re-decide it per hook.

| Domain | Category |
|--------|----------|
| Reference data (static lists) | `infinite` |
| Tickets — referential | `infinite` |
| Configuration, lists, single item, stats, latest item | `short` |
| Access control, application links | `short` |
| Parameters, URLs, translations | `short` |
| Folders, employees | `short` |
| Tickets — core, notes, documents, notifications | `short` |
| Interventions | `short` |
| Documents — billing, invoices, invoices to pay | `short` |
| Authentication / SSO | `default` → plain API call |
| External integrations | `default` → plain API call |

A domain landing on `default` (staleTime 0) gains nothing from TanStack Query: call the
service directly instead of wrapping it in a `useQuery`. No domain currently maps to
`long`; it is reserved for data that is expensive to fetch and tolerates a 15-minute lag.

## Hook Naming

- `useXQuery` — wraps `useQuery`
- `useXMutation` — wraps `useMutation`
