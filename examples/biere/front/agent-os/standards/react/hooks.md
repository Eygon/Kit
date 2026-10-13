---
name: hooks
description: What belongs in a hooks/ folder, when to extract a hook, state shape (one object over many useState), named-object return shape, Loader/Query/Search naming, composing focused sub-hooks, and useCallback/useMemo discipline
metadata:
  type: project
---

# Hooks

## A `hooks/` folder contains only hooks

Every file in any `hooks/` folder is a React hook, named `use*`. A plain async fetcher, a
query function, a pure helper, or a constant is NOT a hook and does not belong there:

- query functions → `src/utils/queryFunctions/<domain>QueryFunctions.ts` (see `react/tanstack-query`)
- pure helpers / constants → a `utils/` folder at scope (see `file-placement`)
- `useXQuery` / `useXMutation` data hooks → placed by scope (see `file-placement`)

A file like `fetchBeerStyles` (no `use`, calls a service and maps the result) is a query
function, not a hook — it lives in `utils/`, never in `hooks/`.

## When to extract a hook — and when NOT to

Extract a dedicated hook when there is a real **side effect**, an **async flow**, or
**non-trivial state** (several interdependent slices, a subtle effect dependency, or logic
reused in more than one place).

Do NOT mint a dedicated hook for trivial state. A lone `useState(false)` + a one-line
toggle is self-explanatory: keep it inline. HeroUI overlays already own their open state
(`Drawer` / `Modal` uncontrolled, or `useOverlayState()` from `@heroui/react` when it must
be controlled) — no `useDisclosure` of our own.

| Case | Decision |
|------|----------|
| Boolean open/close + toggle | Inline, or HeroUI's `useOverlayState` — no new hook |
| Persisted state + a side effect on change (`useCurrentUser`: storage + query invalidation) | Extract |
| `useEffect` syncing state on a prop change, with a deliberate dependency list | Extract — isolates the intent |
| Many homogeneous state slices updated the same way | Extract a hook holding the object + a generic updater |

When a primitive hook gains a second consumer, promote it to the narrowest common scope
(see `file-placement`) instead of duplicating it.

## State shape — one object over many parallel `useState`

When several state slices are homogeneous and updated identically, prefer a single state
object + a generic updater over a wall of `useState`/`useCallback`:

```ts
const [values, setValues] = useState<TastingFormValues>(EMPTY_TASTING_FORM);
const updateValue = useCallback(
  <K extends keyof TastingFormValues>(key: K, value: TastingFormValues[K]) =>
    setValues((previous) => ({ ...previous, [key]: value })),
  [],
);
```

Keep state with distinct semantics separate (search debounce, pagination).

## Return shape — a named object, not a tuple

A hook returns an object with semantic property names: call sites stay
self-documenting and the API can grow without breaking positional destructuring.

```ts
const { currentUserId, changeCurrentUser } = useCurrentUser();
```

- A hook with a single output may return the bare value (`useIsTabletUp(): boolean`). Wrap
  in an object as soon as there are 2+ outputs.
- Never return a positional tuple. The ONE exception is a hook that deliberately
  mimics React's `useState` `[value, setValue]` API — and it still goes through
  `KeyValueStorage` (see `utils`):

```ts
export const usePersistedState = (key: StorageKeyEnum, fallback: string): [string, Dispatch<SetStateAction<string>>] => {
  const [state, setState] = useState<string>(() => localKeyValueStorage.get(key) ?? fallback);
  useEffect(() => {
    localKeyValueStorage.set(key, state);
  }, [key, state]);
  return [state, setState];
};
```

## Naming by responsibility — Loader vs Query vs Search

The `use*` prefix is not enough: the name encodes the data-access role. These three
are easy to confuse and are NOT interchangeable.

| Family       | Mode                          | Returns               | Reach for it when |
|--------------|-------------------------------|-----------------------|-------------------|
| `useXQuery`  | declarative, auto-fetch+cache | TanStack query object | data has a stable key to fetch & cache (see `react/tanstack-query`) |
| `useXLoader` | imperative, no cache          | `{ loadX }` callback  | typeahead (`Autocomplete` / `ComboBox`) — the field triggers a debounced search and consumes results via callback |
| `useXSearch` | orchestrator                  | full search-field state | a search screen's whole UI: owns input + debounce, calls a Query inside, exposes select/reset |

```ts
export function useBeerSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedTerm = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS);
  const { data: beers = [], isFetching } = useBeerSearchQuery(debouncedTerm);
  return { searchTerm, setSearchTerm, beers, isFetching, reset: () => setSearchTerm("") };
}
```

Writes use `useXMutation` — see `react/tanstack-query`.

## Compose focused hooks — don't write a monolith

A high-level hook (`useXDrawer`, `useXForm`, `useXSave`) orchestrates: it calls 2-5
focused sub-hooks and exposes one merged API. Each sub-hook owns a single responsibility
that is testable in isolation (a mutation, a validation, a pending-state slice); the
orchestrator only wires them together.

```ts
export const useTastingSave = ({ onSaved }: UseTastingSaveOptions) => {
  const { values, updateValue, reset } = useTastingFormValues();
  const { mutateAsync, isPending } = useCreateTastingMutation();
  const save = useCallback(async () => {
    await mutateAsync(formValuesToNewTasting(values));
    reset();
    onSaved();
  }, [mutateAsync, values, reset, onSaved]);
  return { values, updateValue, save, isSaving: isPending };
};
```

- Limit: do NOT extract a sub-hook that has no state or effect of its own — a pure
  helper or a one-line computation stays inline (see "When to extract a hook").
- Sub-hooks live at the narrowest scope that consumes them (see `file-placement`).

## useCallback / useMemo — wrap only when it pays off

Memoize for a reason, not by reflex. Wrap a value or handler ONLY when at least one holds:

- it is passed to a child component, OR
- it is read inside a dependency array (effect / memo / query `enabled` / another hook), OR
- it is an expensive computation (filtering or sorting a large list).

- Never memoize a primitive (string/number/boolean): recomputing it is free, and
  `useMemo` only adds noise.
- But do NOT skip it for an object/array/handler that feeds a dependency array — an
  unstable reference re-fires effects and re-runs queries on every render.
