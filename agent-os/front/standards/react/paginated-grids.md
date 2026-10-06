---
name: paginated-grids
description: Server-paginated load-more grids — criteria hook builds the paged DTO, an accumulating query hook appends pages, manual sorting, skeleton/empty/load-more rendering
metadata:
  type: project
---

# Paginated Data Grids (load-more)

Extends `data-tables`. Use this pattern when a grid loads **server-paged** data behind a
"load more" button (append, not replace; sort/filter resolved server-side). No grid in the
codebase currently uses this pattern — `advancedFolderSearch` and the account events grid,
formerly cited here, both migrated to `infinite-scroll-grids`.

When the grid is virtualized and rows should arrive **on scroll** instead, follow
`infinite-scroll-grids` — the Septeo `<Table>` owns the detection there.

The data flow splits across three page-level hooks plus the grid's own table hook — never
one mega-hook:

1. `use<Entity>SearchCriteria` — owns name/filters/sort/page state, builds the paged request DTO.
2. `use<Entity>SearchQuery` — TanStack `useQuery` that **accumulates** pages.
3. `use<Entity>Search` — composes the two and exposes `loadMore`.
4. `useGridTable` (per `data-tables`) — the TanStack table, in **manual-sort** mode.

## Criteria & request DTO

`use<Entity>SearchCriteria` holds every input that shapes the query and assembles the paged
filter. Any criteria change resets to page 1 through one shared `resetToPage1`:

```ts
const setSortBy = useCallback((field, direction) => {
  setSortByField(field);
  setSortDirection(direction);
  resetToPage1();
}, [resetToPage1]);
```

- Free-text is debounced (`useDebouncedCallback`) and gated by a `MIN_LENGTH` before it
  enters the DTO; `pageSize` is a module const (`DEFAULT_PAGE_SIZE`).
- Optional fields are added by conditional spread so an unset value is absent, not sent as
  a default: `...(name.length >= MIN_LENGTH ? { name } : {})`, `...(sortByField ? { sortBy, sortDirection } : {})`.
- `page` and `pageSize` always ride in the DTO.

## Accumulating query

`use<Entity>SearchQuery` keys the query on the **whole filter object** (so page, sort and
every filter are part of the key) and appends pages into a `useRef`:

```ts
const searchQuery = useQuery({
  queryKey: ["<entity>Search", company, filter],
  queryFn: () => Service.searchPaged(filter),
  staleTime: 30_000,
});

if (filter.page === 1) {
  accumulatedItemsRef.current = newItems;
} else if (!searchQuery.isFetching && newItems.length > 0) {
  const existingIds = new Set(accumulatedItemsRef.current.map((i) => i.id));
  const toAppend = newItems.filter((i) => !existingIds.has(i.id));
  if (toAppend.length > 0) accumulatedItemsRef.current = [...accumulatedItemsRef.current, ...toAppend];
}

const items = accumulatedItemsRef.current;
const hasMore = items.length < totalCount;
```

- Page 1 **replaces** the accumulator (new search); page > 1 **appends**, deduped by id, and
  only once the fetch settled (`!isFetching`) to avoid appending a stale page.
- `hasMore` is derived (`items.length < totalCount`), never a server flag.
- Expose both `isLoading` (first load, no data yet) and `isFetching` (any in-flight fetch) —
  the widget and `loadMore` need to tell them apart.

## loadMore

The composition hook increments the page, guarded so a fetch in flight or an exhausted list
is a no-op:

```ts
const loadMore = useCallback(() => {
  if (hasMore && !isFetching) setPage((p) => p + 1);
}, [hasMore, isFetching, setPage]);
```

## Manual (server) sorting

The table sorts server-side — set `manualSorting: true` and **omit** `getSortedRowModel`.
A dedicated hook maps TanStack `SortingState` to the criteria callback and persists it:

```ts
const [sorting, setSorting] = usePersistedState<SortingState>(SORTING_STORAGE_KEY, []);
useEffect(() => {
  if (sorting.length === 0) onSortChange(undefined, undefined);
  else onSortChange(sorting[0].id, sorting[0].desc ? "desc" : "asc");
}, [sorting, onSortChange]);
```

`onSortChange` flows into the criteria hook, which resets to page 1.

## Table hook specifics (beyond `data-tables`)

```ts
const isSkeleton = isLoading && items.length === 0;
useReactTable({
  data: isSkeleton ? [] : items,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  manualSorting: true,
  autoResetPageIndex: false,
  autoResetExpanded: false,
  autoResetAll: false,
});
```

- `isSkeleton` empties `data` on the very first load so skeleton rows render instead of an
  empty table.
- `autoReset*: false` — accumulated rows and expanded state must survive each appended fetch.
- Expandable detail rows use `getExpandedRowModel` + a `renderSubComponent`; keep the column
  count in sync via `table.getVisibleLeafColumns().length` for the `colSpan`.

## Widget rendering

Below `<Table>`, render the three data states — all as `sticky left-0` overlays so they stay
put inside a horizontally scrolling table:

- **Skeleton**: when `isSkeleton`, map a fixed `SKELETON_ROW_KEYS` array to skeleton rows.
- **Empty**: when `!isSkeleton && items.length === 0`, a centered `noResults` message.
- **Load more**: when `hasMore || isLoading`, a button `disabled` while loading, labelled with
  the remaining count `t("...loadMore", { count: totalCount - items.length })`.

All labels via `t(...)` (see `i18n`). Column visibility/order/pinning and the config panel
follow the shared `useTableColumnConfiguration` wiring.
