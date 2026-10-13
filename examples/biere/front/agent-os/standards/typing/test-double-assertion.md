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
const mockToastDanger = toast.danger as unknown as Mock;
const queryClient = { invalidateQueries: vi.fn() } as unknown as QueryClient;
mockGetAll.mockResolvedValue([{ id: 1 }] as unknown as User[]);
```

## In production — narrow instead

Never `as unknown as T` in production (mechanical check). The same cast there hides a
real typing bug. Validate and narrow at the boundary (see `typing/boundary-narrowing`).

**Why:** In a test, a partial mock is an intentional, local lie about a shape. In production, the same lie silences the compiler about a mismatch that will bite at runtime.
