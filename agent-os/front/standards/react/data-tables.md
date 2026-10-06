---
name: data-tables
description: Data table pattern — hook builds TanStack table, thin widget renders Septeo <Table>, column/cell/state conventions
metadata:
  type: project
---

# Data Tables

Engine: `@tanstack/react-table`. Render: `<Table>` from `@septeo/septeo-ui-components`.
Never hand-roll a `<table>`.

## Hook + widget split

Every table — even trivial — splits in two. No exception.

- `use<Entity>Table.tsx` (in `hooks/`): builds columns, returns `useReactTable(...)`.
- `<Entity>Table.tsx` / `<Entity>List.tsx` (widget): calls the hook, renders `<Table table={table} />`.
- Empty state lives in the widget, not the hook:

```tsx
if (rows.length === 0) return <p className="...">{t("...noRows")}</p>;
return <Table table={table} />;
```

## TanStack setup

```tsx
const columns = useMemo<ColumnDef<Entity>[]>(() => [...], [deps]);

return useReactTable({
  data,
  columns,
  getRowId: (row) => String(row.id),
  getCoreRowModel: getCoreRowModel(),
});
```

- `columns` always wrapped in `useMemo` with explicit deps.
- `accessorKey` in camelCase.
- `getRowId` whenever a stable id exists.
- Fixed widths in px via `size` / `minSize`; control/action columns get `enableResizing: false`.

## Cells & headers

- Inline `cell: (info) => ...` only for raw text (`info.getValue()`, simple format).
- Any JSX, conditional, or state → dedicated cell component (`AccountCell`, `IndicatorCell`, `ActionCell`).
- A cell that only forwards its value to a shared cell with no added logic (a pure
  pass-through wrapper) is NOT worth its own component or file — inline it, or group such
  trivial variants in one `cells.tsx`. Reserve a dedicated cell for real logic
  (route/`href`, translation, conditional rendering).
- Long text that can overflow → truncating span with a native `title` tooltip, NOT the
  library `<Tooltip>` (reserve that for rich/interactive content). Matches `offersValidation`:

```tsx
<span className="block truncate" title={value}>{value}</span>
```
- Headers are i18n keys: `header: t("...")`, or a header component for sort/search
  (`SortingHeader`, `SearchingHeader`, `SortButton`).
- Actions column last, `enableResizing: false`, holds `EditButton` / `TrashButton`:

```tsx
{
  accessorKey: "actions",
  header: t("...actions"),
  cell: (info) => (
    <div className="flex gap-(--spacing-tiny)">
      <EditButton onClick={() => onEdit(info.row.original)} />
      <TrashButton onClick={() => onDelete(info.row.original)} />
    </div>
  ),
  enableResizing: false,
}
```

## Feature state

Sorting/filter/visibility/pinning/expanded live in the hook via `useState`, each paired
with its `get*RowModel` and `on*Change` setter:

```tsx
const [sorting, setSorting] = useState<SortingState>([]);
const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

useReactTable({
  // ...
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  state: { sorting, columnFilters },
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  columnResizeMode: "onChange",
});
```

- Add a `get*RowModel` only for the features actually used.
- Resizable tables set `columnResizeMode: "onChange"`.
