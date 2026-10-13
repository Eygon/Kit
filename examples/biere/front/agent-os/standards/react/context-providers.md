---
name: context-providers
description: Context split into context/provider/hook files, null + throwing consumer hook, memoized provider value; app-wide providers mounted once in main.tsx; HeroUI needs no provider
metadata:
  type: project
---

# Context & Providers

Placement (see `file-placement`): global in `src/providers/` + `src/providers/context/`;
page-specific in `src/pages/<page>/providers/` + `.../context/`.

App-wide providers are mounted once, in `src/main.tsx`: `QueryClientProvider`,
`I18nextProvider`, `BrowserRouter`. HeroUI v3 needs **no** provider — do not add a
`HeroUIProvider` (that is v2). Tests mount the same stack through `renderWithProviders`
(`src/__tests__/utils/renderWithProviders.tsx`, with a `MemoryRouter`).

Reach for a context only for state that many components of a subtree read; data from the
backend lives in TanStack Query, not in a context (see `react/tanstack-query`).

## Three files per context

Split every context across three files at the same scope:

- `xContext.ts` — the `createContext` call **and** the value type
  (`type`/`interface XContextType`). No JSX, no logic.
- `xProvider.tsx` — the `XProvider` component: holds state/effects/logic, builds the
  value, renders `<XContext value={...}>` (React 19: the context is its own provider).
- `useXContext.ts` — the consumer hook wrapping `use(XContext)`. Components import this
  hook, never call `use(XContext)` / `useContext(XContext)` directly.

Exports are named: `XContext`, `XProvider`, `useXContext`. Do not colocate the consumer
hook inside the context file.

## Null default + throwing consumer hook

- `createContext<T | null>(null)` — no fake default value.
- The consumer hook throws when the provider is missing:

```ts
import { use } from "react";
import { TastingDraftContext } from "@/pages/journal/providers/context/tastingDraftContext";

export const useTastingDraftContext = () => {
  const context = use(TastingDraftContext);
  if (!context) {
    throw new Error("useTastingDraftContext must be used within TastingDraftProvider");
  }
  return context;
};
```

Exception — optional providers: when consumers must work with no provider mounted, seed
`createContext<T>({ ...no-op defaults })` instead.

## Memoize the provider value

- Wrap the value object in `useMemo` with explicit deps; wrap callbacks in `useCallback`.
  Prevents re-rendering every consumer on each provider render.
- Exception — pass-through providers that only forward a stable prop skip the memo.

## Form state

A form keeps its state in the form itself (HeroUI / React Aria fields, see `react/forms`);
do not hand-roll a context to share field values between steps — lift the values into the
step orchestrator hook instead.
