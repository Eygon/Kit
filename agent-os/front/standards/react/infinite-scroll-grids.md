---
name: infinite-scroll-grids
description: Virtualized infinite-scroll grids — useInfiniteQuery page accumulation, a TableInfiniteScroll config object handed to the Septeo <Table>, derived hasNextPage, and the split first-load vs load-more error states
metadata:
  type: project
---

# Infinite-Scroll Data Grids

Extends `data-tables`. Use this pattern when a grid streams **server-paged** rows as the user
scrolls, with no pagination control. Reference implementation: the account offers grid
(`src/pages/account/.../widgets/offers/`).

Pick between the two paged-grid patterns up front:

- **This standard** — the grid is virtualized (`isVirtualized`) and rows arrive on scroll.
  Detection belongs to the Septeo `<Table>`; the page never listens to `scroll`. Reference
  implementations: the account offers grid, the account events grid, and advanced folder
  search.
- **`paginated-grids`** — the user clicks a "load more" button. Same `useInfiniteQuery`
  accumulation, different affordance; currently unused in the codebase.

Never hand-roll a scroll listener. `useTicketsInfiniteScroll`
(`src/pages/supportTickets/hooks/`) predates `TableInfiniteScroll` and is **legacy** — do not
copy it into a new grid.

## Three layers

1. `use<Entity>Query(ownerId, criteria)` — `useInfiniteQuery`, flattens pages, derives the
   flags, exposes `resetKey`.
2. `use<Entity>Grid()` — composes the query with `useGridTable` and assembles the
   `TableInfiniteScroll` object.
3. The content widget — renders the Septeo `<Table>` and forwards `infiniteScroll` untouched.

## Query hook

```ts
const resetKey = JSON.stringify(criteria);

const query = useInfiniteQuery({
  queryKey: accountOfferKeys.grid(company, accountId, criteria),
  queryFn: ({ pageParam = 1 }) =>
    fetchAccountOfferGridPage(accountId, { ...criteria, page: pageParam, pageSize: PAGE_SIZE }),
  getNextPageParam: (lastPage, allPages) => {
    const totalLoaded = allPages.length * PAGE_SIZE;
    return totalLoaded < lastPage.page.totalCount ? allPages.length + 1 : undefined;
  },
  initialPageParam: 1,
  staleTime: queryTimes.staleTime.short,
  gcTime: queryTimes.gcTime.default,
  retry: false,
  enabled: accountId > 0,
});
```

- The key comes from the domain key factory and carries `company`, the owner id and the
  **whole criteria object** (per `tanstack-query`); a criteria change is a new query, not a
  manual reset.
- `getNextPageParam` returns `undefined` from a **derived** exhaustion check
  (`loaded < totalCount`) — never a server `hasMore` flag.
- `retry: false` — a failed page must surface immediately; the user re-triggers it.
- `enabled` guards the placeholder id (`accountId > 0`) so no request fires before the route
  param resolves.
- Cursor (keyset) paging is allowed where the sort makes it sound — return the cursor fields
  from the last page and fall back to `skip`/`page` for every other sort
  (`useAccountEventsQuery` shows the hybrid).

### Derived return shape

Aggregates come from **page 0 only**, rows from every page:

```ts
const pages = query.data?.pages ?? [];
const items = pages.flatMap((page) => page.page.items);
const totalCount = pages[0]?.totalCount ?? 0;
```

Split the error into two states — they render in different places:

```ts
isLoadError: isError && items.length === 0,      // first load failed → full-surface error
isLoadMoreError: isError && items.length > 0,    // a later page failed → footer banner, rows stay
```

Return a `Readonly<{...}>` object from a `useMemo`, and wrap `refetch` in a `useCallback` that
discards the promise (`() => void refetch()`) so the consumer keeps a `() => void` signature.
Export `resetKey` alongside the data — the table needs it to scroll back to the top.

## The TableInfiniteScroll object

```ts
const infiniteScroll: TableInfiniteScroll<string> = {
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  resetKey,
  thresholdPx: ACCOUNT_OFFERS_INFINITE_SCROLL_THRESHOLD_PX,
};
```

- `TableInfiniteScroll` is imported as a type from `@septeo/septeo-ui-components`; the generic
  is the `resetKey` type (`string`).
- `resetKey` is the serialized criteria. When it changes the table resets `scrollTop` — a new
  filter must not land the user mid-list.
- `thresholdPx` always comes from a named `*_THRESHOLD_PX` const in the grid's constants file,
  never an inline number (per `constants`).
- The object is a plain literal rebuilt each render — no `useMemo`; the table reads it, it is
  not a dependency.

## Widget rendering

```tsx
<Table
  table={table}
  isVirtualized
  maxHeight="100%"
  estimateRowHeight={TABLE_ROW_HEIGHT_PX}
  infiniteScroll={infiniteScroll}
/>
```

- `isVirtualized` + `maxHeight="100%"` + `estimateRowHeight` are required together: without
  virtualization the table owns no scroll container and `infiniteScroll` never fires.
- Every ancestor between the page `<section>` and the table carries
  `flex min-h-0 flex-1 overflow-hidden` (or `flex-col` equivalents). A missing `min-h-0`
  collapses the scroll container and the grid loads exactly one page, silently.
- Props pass through the content widget verbatim — it never reads `hasNextPage` or calls
  `fetchNextPage` itself.

### Load-more feedback, outside the table

Below the table, still inside the grid `<section>`:

- **In flight** — `isFetchingNextPage && !isLoadMoreError`: a centered spinner strip
  (`ri-loader-4-line` + `animate-spin`) on a `border-t`.
- **Failed page** — `isLoadMoreError`: a `role="alert"` strip with the error copy and, when
  `hasNextPage`, a secondary `<Button>` calling `fetchNextPage`, `aria-busy` +
  `disabled` on `isFetchingNextPage` (per `live-regions`).
- **First load / empty / hard error** stay inside the content widget (skeleton, empty state,
  `SectionError`) per `ui-states`.

All copy through `t(...)`, keys grouped in a `*_STATE_LABEL_KEYS` record.

## Forbidden

- A `scroll` / `IntersectionObserver` listener in page code, or reaching into the table DOM
  (`querySelector(".table-container")`, manual `scrollTop`).
- Accumulating pages in `useState`/`useRef` — `useInfiniteQuery` owns the accumulator.
- A single `isError` flag for both the first load and a later page.
- `hasNextPage` read from a server field instead of the loaded-vs-total comparison.

## Testing

Mock the library and spy on the props to assert the wiring (per `mocking-conventions`):

```tsx
const { tablePropsSpy } = vi.hoisted(() => ({ tablePropsSpy: vi.fn() }));
vi.mock("@septeo/septeo-ui-components", () => ({
  Table: (props: { infiniteScroll: TableInfiniteScroll }) => {
    tablePropsSpy(props);
    return <div data-testid="offers-table" />;
  },
}));
```

Cover at minimum: the `infiniteScroll` object reaches the table unchanged; `getNextPageParam`
returns `undefined` on the last page; `isLoadError` and `isLoadMoreError` are mutually
exclusive; a `resetKey` change is driven by criteria, not by a manual call.
