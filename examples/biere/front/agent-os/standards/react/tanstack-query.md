---
name: tanstack-query
description: TanStack Query v5 conventions — shared queryClient (retry 1, no refetch on focus), file triad, query key factory, queryTimes with the cache category fixed per domain, hook naming
metadata:
  type: project
---

# TanStack Query Conventions

The single `QueryClient` is `src/config/queryClient.ts` (`retry: 1`,
`refetchOnWindowFocus: false`), mounted in `src/main.tsx`. Tests build their own with
`createTestQueryClient()` (`retry: false`) through `renderWithProviders`.

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
forbids.

## Query Keys

Factory pattern with `all`, `list`, `detail`:

```ts
export const beerKeys = {
  all: () => ["beers"] as const,
  list: (search: string) => [...beerKeys.all(), "list", search] as const,
  detail: (beerId: number) => [...beerKeys.all(), "detail", beerId] as const,
};
```

No user id in the keys: the identity is a header, and changing the demo user invalidates
every query (`useCurrentUser`).

## staleTime / gcTime

Always use `queryTimes` from `src/config/tanstackQuery.ts` — never hardcode durations.

| Category | staleTime | gcTime |
|----------|-----------|--------|
| `default` | 0 | 5 min |
| `short` | 30s | 5 min |
| `long` | 15 min | 1h |
| `infinite` | ∞ | ∞ |

```ts
export const useBeerQuery = (beerId: number) =>
  useQuery({ queryKey: beerKeys.detail(beerId), queryFn: () => fetchBeer(beerId), ...queryTimes.long });
```

## Category per domain

Which category a query takes is fixed per domain — do not re-decide it per hook.

| Domain | Category |
|--------|----------|
| Reference data (beer styles, countries) | `infinite` |
| Beer encyclopedia (beers, breweries) | `long` |
| Places on the map | `long` |
| Users (demo users, `/users/me`) | `short` |
| Journal (tastings, ratings, photos) — the user's own data | `short` |
| Health check | `default` → plain API call |

A domain landing on `default` (staleTime 0) gains nothing from TanStack Query: call the
service directly instead of wrapping it in a `useQuery`.

## Hook Naming

- `useXQuery` — wraps `useQuery`
- `useXMutation` — wraps `useMutation` (cache updates: see `react/mutation-cache-updates`)
