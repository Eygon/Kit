---
name: test-double-assertion
description: as unknown as T (double assertion) is allowed only in tests for partial mocks; production code must narrow instead
metadata:
  type: project
---

# Double Assertion: tests only

`as unknown as T` is a **test-only** escape hatch. Production code never uses it.

## In tests — building partial mocks

Test doubles are deliberately incomplete. The double assertion documents that intent.

```ts
const info = { getValue: () => "x" } as unknown as HeaderContext<TestRow, unknown>;
const store = { tabs } as unknown as RootState;
mockService.getDetail.mockResolvedValue({ id: 12437 } as unknown as SupportRequestDetail);
```

## In production — narrow instead

Never `as unknown as T` in production. The same cast there hides a real typing bug. Validate and narrow at the boundary (see [[boundary-narrowing]]).

**Why:** In a test, a partial mock is an intentional, local lie about a shape. In production, the same lie silences the compiler about a mismatch that will bite at runtime.

> Known debt: `useInputKeyDown` casts a React event to a native `KeyboardEvent` this way — to be removed, not copied.
