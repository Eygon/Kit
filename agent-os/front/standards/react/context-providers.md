---
name: context-providers
description: Context split into context/provider/hook files, null + throwing consumer hook, memoized provider value, RHF FormProvider for form state
metadata:
  type: project
---

# Context & Providers

Placement (see `managing-context` / `file-placement`): global in `src/providers/` +
`src/providers/context/`; page-specific in `src/pages/<page>/providers/` + `.../context/`.

## Three files per context

Split every context across three files at the same scope:

- `xContext.ts` — the `createContext` call **and** the value type
  (`type`/`interface XContextType`, plus related enums). No JSX, no logic.
- `xProvider.tsx` — the `XProvider` component: holds state/effects/logic, builds the
  value, renders `<XContext.Provider value={...}>`.
- `useXContext.ts` — the consumer hook wrapping `useContext`. Components import this hook,
  never call `useContext(XContext)` directly.

Exports are named: `XContext`, `XProvider`, `useXContext`. Do not colocate the consumer
hook inside the context file.

## Null default + throwing consumer hook

- `createContext<T | null>(null)` (or `<T | undefined>(undefined)`) — no fake default value.
- The consumer hook throws when the provider is missing:

```ts
export const useXContext = () => {
    const context = useContext(XContext);
    if (!context) {
        throw new Error("useXContext must be used within XProvider");
    }
    return context;
};
```

Exception — optional providers: when consumers must work with no provider mounted, seed
`createContext<T>({ ...no-op defaults })` instead (e.g. `navigationGuardContext`:
`registerGuard: () => {}`).

## Memoize the provider value

- Wrap the value object in `useMemo` with explicit deps; wrap callbacks in `useCallback`.
  Prevents re-rendering every consumer on each provider render.
- Exception — pass-through providers that only forward a stable prop (e.g.
  `AccountInfoProvider` forwarding `accountInfo`) skip the memo.

## Form state uses RHF `FormProvider`

For shared form state, render react-hook-form's `FormProvider {...methods}` — do not
hand-roll a `createContext`. Consumers read it with `useFormContext`.
