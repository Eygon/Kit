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

A file like `fetchAdvancedFolderSearchParameters` (no `use`, calls a service and maps the
result) is a query function, not a hook — it lives in `utils/`, never in `hooks/`.

## When to extract a hook — and when NOT to

Extract a dedicated hook when there is a real **side effect**, an **async flow**, or
**non-trivial state** (several interdependent slices, a subtle effect dependency, or logic
reused in more than one place).

Do NOT mint a dedicated hook for trivial state. A lone `useState(false)` + a one-line
toggle is self-explanatory: keep it inline, or reuse an existing shared primitive.

| Case | Decision |
|------|----------|
| Boolean open/close + toggle | Inline, or reuse `useCollapsible` — no new hook |
| `useEffect` syncing state on a prop change, with a deliberate dependency list | Extract — isolates and documents the intent |
| Many homogeneous state slices updated the same way | Extract a hook holding the object + a generic updater |

When a primitive hook (e.g. `useCollapsible`) gains a second consumer, promote it to the
narrowest common scope (see `file-placement`) instead of duplicating it.

## State shape — one object over many parallel `useState`

When several state slices are homogeneous and updated identically, prefer a single state
object + a generic updater over a wall of `useState`/`useCallback`:

```ts
const [filters, setFilters] = useState<FilterSelection>(EMPTY_FILTER_SELECTION);
const updateFilter = useCallback(
    <K extends keyof FilterSelection>(key: K, value: FilterSelection[K]) =>
        setFilters((prev) => ({ ...prev, [key]: value })),
    []
);
```

Keep state with distinct semantics separate (search debounce, pagination, sorting).

Deliberate exception — `react/data-tables`: table feature-state (sorting / filter /
visibility / expanded) stays as separate `useState` slices, each paired with its own
`get*RowModel` and `on*Change` setter.

## Return shape — a named object, not a tuple

A hook returns an object with semantic property names: call sites stay
self-documenting and the API can grow without breaking positional destructuring.

```ts
const { searchTerm, setSearchTerm, results, isLoading, reset } = useAccountSearch();
```

- A hook with a single output may return the bare value
  (`useCompanyDisplayLabel(): string`, `useHeaderHeight(): number`). Wrap in an
  object as soon as there are 2+ outputs.
- Never return a positional tuple. The ONE exception is a hook that deliberately
  mimics React's `useState` `[value, setValue]` API:

```ts
export const usePersistedState = <T>(
    key: string,
    fallback: T
): [T, Dispatch<SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
        const raw = localKeyValueStorage.get(key);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return fallback;
        }
    });
    useEffect(() => {
        localKeyValueStorage.set(key, JSON.stringify(state));
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
| `useXLoader` | imperative, no cache          | `{ loadX }` callback  | typeahead/autocomplete — the field triggers a debounced search and consumes results via callback |
| `useXSearch` | orchestrator                  | full search-field state | a search field's whole UI: owns input + debounce, calls a Query/Loader inside, exposes select/reset/showResults |

```ts
// Loader — imperative, debounced, callback-driven; no auto-fetch, no cache
export const useAccountSearchLoader = (options) => {
    const fetchAndCallback = useCallback(
        (inputValue, callback) => {
            if (inputValue.trim().length < 2) return callback([]);
            fetchAccountSearch(inputValue, ...).then(callback);
        },
        [...]
    );
    return { loadAccounts: useDebouncedCallback(fetchAndCallback) };
};
```

```ts
// Search — orchestrates input state + a Query + UI handlers; the component wires nothing
export function useAccountSearch() {
    const [searchTerm, setSearchTerm] = useState("");
    // debounce searchTerm -> useAccountSearchQuery(...)
    return { searchTerm, setSearchTerm, searchResults, showResults, handleSelectAccount, reset };
}
```

Writes use `useXMutation` — see `react/tanstack-query`.

## Compose focused hooks — don't write a monolith

A high-level hook (`useXPanel`, `useXForm`, `useXCard`, `useXSave`) orchestrates: it
calls 2-5 focused sub-hooks and exposes one merged API. Each sub-hook owns a single
responsibility that is testable in isolation (a mutation, a validation, a guard, a
pending-state slice); the orchestrator only wires them together.

```ts
const useAccountSave = ({ accountId, onSuccess }): UseAccountSaveReturn => {
    const { hasPendingChanges, buildMultiOfficeDto, clearPendingChanges } = useMultiOfficePending();
    const { mutateAsync, isPending } = useUpdateAccountMutation(accountId);
    const validateMultiOffice = useMultiOfficeSaveValidation(accountId);
    const ensureGroupIdentifierResolved = useGroupIdentifierSaveGuard(accountId);
    // ...wires validate -> build DTO -> mutate
    return { save, isSaving: isSaving || isPending };
};
```

- Limit: do NOT extract a sub-hook that has no state or effect of its own — a pure
  helper or a one-line computation stays inline (see "When to extract a hook").
- Sub-hooks live at the narrowest scope that consumes them (see `file-placement`).

## useCallback / useMemo — wrap only when it pays off

Memoize for a reason, not by reflex. Wrap a value or handler ONLY when at least one holds:

- it is passed to a child component, OR
- it is read inside a dependency array (effect / memo / query `enabled` / another hook), OR
- it is an expensive computation (a validation loop, filtering or sorting a large list).

```ts
const currentStepFields = useMemo(() => stepFields[step], [step]);          // feeds a dep array
const isCurrentStepValid = useMemo(() => validate(currentStepFields), [currentStepFields, values]);
const goNext = useCallback(() => setStep((s) => s + 1), []);                // handed to a child
```

- Never memoize a primitive (string/number/boolean): recomputing it is free, and
  `useMemo` only adds noise.
- But do NOT skip it for an object/array/handler that feeds a dependency array — an
  unstable reference re-fires effects and re-runs queries on every render.
