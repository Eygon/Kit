---
name: mocking-conventions
description: vi.mock conventions for default-export services, hooks, and form-field components (avoids false-red infra failures)
metadata:
  type: project
---

# Mocking Conventions

The runner is **Vitest**, not Jest. `vi`, `describe`, `it`, `expect` and `beforeEach` are
globals (`globals: true` in `vitest.config.ts`) — no value import needed. Mock **types** are
not global: `import type { Mock } from "vitest";` when you cast.

These conventions exist because broken mocks produce false test failures (`TypeError: Cannot read properties of undefined`, `is not a function`) that look like real failures but are not — they waste a full diagnose/rewrite cycle.

## Default-export modules → always `__esModule: true`

A service exported as `export default class XService` is consumed via a default import. A `vi.mock` factory MUST mark itself as an ES module, otherwise the default import does not unwrap `.default` and every static method reads as `undefined`.

```ts
// correct
vi.mock("@api/ticket/ticketReferentialService", () => ({
  __esModule: true,
  default: { fetchPriorities: vi.fn() }
}));
import TicketReferentialService from "@api/ticket/ticketReferentialService";
const mockFetch = TicketReferentialService.fetchPriorities as Mock;

// wrong — `TicketReferentialService.fetchPriorities` is undefined at runtime
vi.mock("@api/ticket/ticketReferentialService", () => ({
  default: { fetchPriorities: vi.fn() }
}));
```

Named-export modules (hooks like `export const usePrioritiesQuery`) do not need `__esModule`:

```ts
vi.mock("@hooks/ticket/usePrioritiesQuery", () => ({
  usePrioritiesQuery: () => mockUsePrioritiesQuery()
}));
```

## Outer variables in a factory → `vi.hoisted`, never a `mock*` prefix

`vi.mock` is hoisted above the file's declarations. A factory that dereferences an outer
`const` **as it is evaluated** throws `Cannot access '…' before initialization`. Jest's
escape hatch — naming the variable `mockXxx` — does **not** exist in Vitest. Declare the
shared value with `vi.hoisted`:

```ts
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock
}));
```

A variable read inside a function the factory *returns* is fine — it resolves when the test
calls it, long after hoisting:

```ts
let useAccountSearchReturn: Record<string, unknown>;
vi.mock("@hooks/useAccountSearch", () => ({
  useAccountSearch: () => useAccountSearchReturn   // lazy — no vi.hoisted needed
}));
```

## One `vi.mock` per module path

Two `vi.mock` calls for the same path in one file do not merge and the winner is not
deterministic. Mock a path once and vary the behaviour per test (`mockReturnValue`,
reassigning a `vi.hoisted` value) instead of redeclaring the module.

## Form-field component mocks MUST wire `onChange`

When a test drives a selection to assert downstream behaviour (e.g. selecting a nature must trigger `useCategoriesByNatureQuery(natureId)`), an inert mock that only renders options does NOT update react-hook-form state — the selection never propagates and the assertion fails for the wrong reason.

- Prefer NOT mocking the project field wrappers (`FavoriteReasonDropdownField`, etc.): they use `useController` and, combined with a mocked design-system `DropdownSingle` that calls `onChange`, the value reaches the form.
- If you must mock a field, wire its `onChange` to the form (`useController` or the passed handler). Never render a `<select>` whose `onChange` is a no-op when the test depends on the selection.

## A red test must fail by assertion, not by mock infrastructure

Before treating a failing test as a valid TDD red, confirm the failure is an assertion (`Expected … Received …`, `Received number of calls: 0`), not a `TypeError` / `Cannot read properties` / `is not a function` / `Test suite failed to run`. The latter mean the mock or import is broken — fix the test, do not write production code against it.
