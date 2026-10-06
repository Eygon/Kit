---
name: grid-filters
description: Grid filter system + active-filter chips — applied/draft split, SidePanel of FilterSections, and a derived removable-Chip bar above the grid
metadata:
  type: project
---

# Grid Filters & Active-Filter Chips

Filtering a grid is two decoupled pieces: a **filter panel** that edits a selection,
and a **chip bar** that renders the applied selection above the grid and removes entries
one by one. Never merge them into one component.

Reference implementations: filter panel in `advancedFolderSearch`
(`advancedFolderSearchFilterPanel`), chip bar in `escalationRequestConsole`
(`escalationRequestConsoleFilterBar`) and `escalationRequest` (`keywordChips`).

## Selection shape

One flat `FilterSelection` type in `types/filters.ts`, one field per facet. Multi-value
facets are `number[]` / `string[]`; single-value facets are a scalar (`boolean | undefined`).

```ts
export type FilterSelection = {
  subNatureIds: number[];
  stateIds: number[];
  keyAccount: boolean | undefined;
  // one field per facet…
};
```

- Export an `EMPTY_FILTER_SELECTION` constant (in `utils/emptyFilterSelection.ts`) — the
  single source for "no filters", used for the initial state and for reset.
- Never store labels in the selection — it holds ids only. Labels are resolved from the
  `options` referential at render time (see chip derivation).

## State ownership — applied vs draft

Two levels of state. Do not collapse them.

- **Applied** filters live in the page-level search hook (`use<Entity>Search`) next to the
  query; changing them re-runs the search. The page passes them down and never lets a child
  mutate them directly — only via `onApplyFilters`.
- **Draft** filters live inside the panel via `useFilterDraft(selectedFilters, isOpen)`.
  The draft re-seeds from the applied selection every time the panel opens, so cancelling
  (closing without applying) discards edits:

```ts
export const useFilterDraft = (selectedFilters: FilterSelection, isOpen: boolean) => {
  const [draft, setDraft] = useState<FilterSelection>(selectedFilters);
  useEffect(() => {
    if (isOpen) setDraft(selectedFilters);
  }, [isOpen]);
  return { draft, setDraft };
};
```

Panel actions: **Apply** calls `onApplyFilters(draft)` then closes; **Reset** sets the draft
to `EMPTY_FILTER_SELECTION`, applies it, and closes.

## Filter panel

A `SidePanel` (Septeo) holding one `FilterSection` per facet. Each section is a controlled
list driven by `selectedIds` + `onToggle`, resolving option labels from `options`.

```tsx
<FilterSection
  label={t("pages.x.filterState")}
  options={options.states}
  selectedIds={draft.stateIds}
  onToggle={(id) => setDraft((d) => ({ ...d, stateIds: toggleId(d.stateIds, id) }))}
  noValueLabel={t("pages.x.noValue")}
/>
```

Multi-value toggling goes through the shared pure helper — never inline the include/filter:

```ts
export const toggleId = (ids: number[], id: number): number[] =>
  ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
```

## Active-filter chips

The chip bar sits between the search/filter toolbar and the grid, and shows **applied**
filters (not the draft). It splits into three layers — the rendering is shared, the
derivation is per-screen:

1. **Shared presentational component** `ActiveFilterChips`
   (`src/components/widgets/activeFilterChips/`) — pure props, i18n-agnostic (every string
   arrives already translated). Reused across every grid.
2. **Per-screen derivation hook** — flattens that screen's `FilterSelection` + `options`
   into `ActiveFilterChip[]`. The selection shape differs per screen, so this never goes
   shared.
3. **Per-screen wrapper widget** — calls the hook, owns the `null` guard and the container
   layout (padding/border), and passes the chips + `clearAllLabel` to the shared component.

```ts
export type ActiveFilterChip = {
  id: string;
  label: string;
  iconAriaLabel: string;
  onRemove: () => void;
};
```

- Chip `id` is `` `${facet}:${value}` `` — stable and unique across facets (used as React key).
- `label` is composed via a `t("...activeFilter", { axis, value })` key (never string-
  concatenated in code); the value label is resolved from `options`. A scalar facet
  (e.g. `keyAccount`) yields a single chip.
- `iconAriaLabel` is the removal announcement — `t("...removeFilter", { label })`.
- `onRemove` removes exactly that value from the applied selection and re-applies — reuse
  `toggleId` for multi-value facets, reset the field to its empty value for scalars:

```ts
const removeState = (id: number) =>
  onApplyFilters({ ...filters, stateIds: toggleId(filters.stateIds, id) });
```

The shared component renders each entry with the Septeo `Chip`, close icon wired to
`onIconClick`, its accessible name via the `iconAriaLabel` prop, and a text clear-all
button. An optional `leading` slot carries a screen-specific chip (e.g. the free-text
search chip in `escalationRequestConsoleFilterBar`):

```tsx
<div className="flex items-center gap-2 flex-wrap">
  {leading}
  {chips.map((chip) => (
    <Chip
      key={chip.id}
      chipColor="neutral"
      icon={<Icon name="ri-close-line" size="sm" />}
      iconAriaLabel={chip.iconAriaLabel}
      onIconClick={chip.onRemove}
    >
      {chip.label}
    </Chip>
  ))}
  <Button variant="text" size="sm" onClick={onClearAll}>{clearAllLabel}</Button>
</div>
```

The wrapper guards the empty case and owns layout — so an empty selection renders nothing,
not an empty bordered strip:

```tsx
if (chips.length === 0) return null;
return (
  <div className="flex-shrink-0 px-4 py-2 border-b border-(--neutral-20)">
    <ActiveFilterChips chips={chips} onClearAll={clearAll} clearAllLabel={t("...clearAll")} />
  </div>
);
```

- `clearAll` applies `EMPTY_FILTER_SELECTION` (same reset path as the panel).

## Accessibility & i18n

- All chip labels, `noValueLabel`, and button text go through `t(...)` — no hardcoded copy.
  Resolve strings in the per-screen layer; the shared component receives them as props.
- The close affordance needs an accessible name: `<Icon>` is `aria-hidden`, so pass the
  Septeo `Chip`'s `iconAriaLabel` prop (`t("...removeFilter", { label })`). A third-party
  chip with no such prop takes an adjacent `sr-only` span instead, per `icons-and-labels`.
- Chip colours use design tokens (`chipColor="neutral"` or `backgroundColor="var(--…)"`),
  never raw palette values.
