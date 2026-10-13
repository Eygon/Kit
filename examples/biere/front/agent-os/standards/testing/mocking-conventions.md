---
name: mocking-conventions
description: vi.mock conventions for default-export services, hooks, and HeroUI side effects (avoids false-red infra failures); vi.hoisted for shared mock values; one vi.mock per path
metadata:
  type: project
---

# Mocking Conventions

The runner is **Vitest**, not Jest. `vi`, `describe`, `it`, `expect` and `beforeEach` are
globals (`globals: true` in `vitest.config.ts`) — no value import needed. Mock **types** are
not global: `import type { Mock } from "vitest";` when you cast.

These conventions exist because broken mocks produce false test failures (`TypeError: Cannot read properties of undefined`, `is not a function`) that look like real failures but are not — they waste a full diagnose/rewrite cycle.

## Default-export modules → `default` key in the factory

A service exported as `export default class XService` is consumed via a default import. The
`vi.mock` factory returns its stand-in under `default`:

```ts
vi.mock("@/api/users/userService", () => ({
  default: { getAll: vi.fn() },
}));
import UserService from "@/api/users/userService";
const mockGetAll = UserService.getAll as Mock;
```

Named-export modules (hooks like `export const useBeersQuery`, the `httpClient` object) are
mocked by name:

```ts
vi.mock("@/api/httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), postForm: vi.fn() },
}));
```

A module that mixes both exports both keys in the factory.

## Outer variables in a factory → `vi.hoisted`, never a `mock*` prefix

`vi.mock` is hoisted above the file's declarations. A factory that dereferences an outer
`const` **as it is evaluated** throws `Cannot access '…' before initialization`. Jest's
escape hatch — naming the variable `mockXxx` — does **not** exist in Vitest. Declare the
shared value with `vi.hoisted`:

```ts
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigateMock,
}));
```

A variable read inside a function the factory *returns* is fine — it resolves when the test
calls it, long after hoisting:

```ts
let useBeersQueryReturn: Record<string, unknown>;
vi.mock("@/pages/encyclopedia/hooks/useBeersQuery", () => ({
  useBeersQuery: () => useBeersQueryReturn,
}));
```

## Partial mocks keep the rest of the module

When only one export must be replaced (`useNavigate`, `toast`), spread
`importOriginal()` so the real `NavLink`, `MemoryRouter` or HeroUI components keep working.
A bare `vi.mock("@heroui/react", () => ({ toast: ... }))` is only acceptable in a test that
renders no HeroUI component (`displayError.test.ts`).

## One `vi.mock` per module path

Two `vi.mock` calls for the same path in one file do not merge and the winner is not
deterministic. Mock a path once and vary the behaviour per test (`mockReturnValue`,
reassigning a `vi.hoisted` value) instead of redeclaring the module.

## Fields: do not mock HeroUI inputs

A test that drives a selection to assert downstream behaviour renders the real HeroUI
`Select` / `TextField` / `Switch` and uses `userEvent`. An inert mock that only renders
options never calls `onChange`, and the assertion fails for the wrong reason.

## Globals and env

- `fetch`: `vi.stubGlobal("fetch", mockFetch)` + `vi.unstubAllGlobals()` in `afterEach`;
  build a fresh `Response` per call (`mockImplementation(async () => new Response(...))`) —
  a `Response` body can be read once.
- `import.meta.env`: `vi.stubEnv("VITE_API_URL", "...")` then `vi.resetModules()` and a
  dynamic `import()` of the module under test.
- `localStorage`: real in jsdom — `window.localStorage.clear()` in `beforeEach`, or pass an
  in-memory `KeyValueStorage` (`createMemoryKeyValueStorage`).

## A red test must fail by assertion, not by mock infrastructure

Before treating a failing test as a valid TDD red, confirm the failure is an assertion (`Expected … Received …`, `Received number of calls: 0`), not a `TypeError` / `Cannot read properties` / `is not a function` / `Test suite failed to run`. The latter mean the mock or import is broken — fix the test, do not write production code against it.
