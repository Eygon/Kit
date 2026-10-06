---
name: generic-unknown-slots
description: Generic constraints and unused library type slots use unknown, never any
metadata:
  type: project
---

# unknown in generic slots

Wherever `any` is tempting in a type position, use `unknown`.

## Variadic / callback generic constraints

Constrain with `unknown[]`, not `any[]` — the constraint holds without disabling
type-checking at call sites; concrete params stay inferred.

```ts
const useDebouncedCallback = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
) => { ... };

function debounce<T extends (...args: unknown[]) => void>(fn: T, waitMs: number): T { ... }
```

## Unused library type slots

Library generics you don't constrain take `unknown` — never `any`, never an invented type.

```ts
CellContext<SearchedAccountGrid, unknown>     // TanStack Table value slot
HeaderContext<OfferPendingValidation, unknown>
useMutation<void, unknown, boolean, Context>  // TanStack Query error slot
```

**Why:** `unknown` keeps the no-`any` guarantee everywhere; an `any` slot leaks untyped
values into otherwise-typed call sites.
