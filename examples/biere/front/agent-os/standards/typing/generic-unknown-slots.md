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
export const debounce = <TArgs extends unknown[]>(fn: (...args: TArgs) => void, waitMs: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: TArgs) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
};
```

## Unused library type slots

Library generics you don't constrain take `unknown` — never `any`, never an invented type.

```ts
useMutation<Tasting, unknown, NewTasting>({ mutationFn: createTasting });   // TanStack Query error slot
const ref = useRef<unknown>(null);
```

`httpClient.get<T>` is the exception that proves the rule: its slot is the DTO you expect,
never `unknown` by laziness nor `any`.

**Why:** `unknown` keeps the no-`any` guarantee everywhere (eslint `no-explicit-any` is an
error); an `any` slot leaks untyped values into otherwise-typed call sites.
