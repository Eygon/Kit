---
name: redux-store
description: Typed RTK store conventions — useAppSelector/useAppDispatch only, single typed slice state, named reducer + action exports, selectors typed on a narrow slice shape with createSelector, cross-slice reactions via extraReducers, sync orchestration thunks in actions/; async fetch in TanStack Query only (createAsyncThunk forbidden except legacy tabsCache)
metadata:
  type: project
---

# Redux Store

Typed Redux Toolkit store under `src/store/`: `slices/`, `selectors/`, `actions/`.
Store = `combineReducers` + `configureStore` (`store/store.ts`), exposing `RootState` / `AppDispatch`.

## Typed hooks only

- Use `useAppSelector` / `useAppDispatch` (`store/hooks.ts`) — never raw `useSelector` / `useDispatch`.
- Outside React, read via `store.getState()` (e.g. `getSelectedCompany`) — never import a hook there.

## Slices (`slices/somethingSlice.ts`)

- `createSlice` with a single typed state object (`type XxxState`) + typed `initialState`.
- Type every payload: `PayloadAction<...>`.
- Reducers stay pure (Immer mutation ok). Compose via `slice.caseReducers.other(state)`.
- Pure helpers live as module functions outside `createSlice` (e.g. `ensureSubsidiary`).
- Export actions named. **Export the reducer named**: `export const xxxReducer = slice.reducer` — not default.
- Use a `prepare` callback when an action needs argument shaping (e.g. `openCreateTicketPanel`).

## Selectors (`selectors/somethingSelectors.ts`)

- Named `selectXxx`.
- Type the param on a **narrow slice shape**, not `RootState`: `type RootStateWithTabs = { tabs: TabsState }`. Keeps selectors decoupled from the global store.
- Memoize derived selectors with `createSelector`; compose selectors from selectors. Plain functions only for raw field reads.

## Cross-slice reactions

- React to another slice's action via `extraReducers` + `builder.addCase(foreignAction, ...)` (e.g. `tabsCache` / `tabPayloads` clear on `closeTabCompletely`).
- UI-triggered multi-slice orchestration = a **plain synchronous thunk** in `actions/`: `(snapshot) => (dispatch: AppDispatch): void => { ... }`.

## Async data

- Async fetch lives in **TanStack Query hooks — never in the store**. Do not add `createAsyncThunk`.
- Exception (legacy, do not reproduce): `tabsCacheSlice` uses `createAsyncThunk` for a cross-tab/popout cache with TTL + LRU eviction.
