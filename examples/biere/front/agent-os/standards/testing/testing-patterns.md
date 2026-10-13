---
name: testing-patterns
description: Mirror file structure in src/__tests__, one test file per source file, mapper test cases, component tests that render real HeroUI components through renderWithProviders and query by role/name, jsdom shims in setup.ts
metadata:
  type: project
---

# Testing Patterns

The runner is **Vitest** (`npm test`; one file: `node node_modules/vitest/vitest.mjs run --coverage=false <file>`),
jsdom, configured with `globals: true` — `describe`, `it`, `expect`, `beforeEach` and `vi`
need no import. Mock **types** do: `import type { Mock } from "vitest";`.

## File Structure

Tests mirror the source path under `src/__tests__/`, one test file per source file:
```
src/components/elements/tabBarItem/utils/getTabBarItemClasses.ts
src/__tests__/components/elements/tabBarItem/utils/getTabBarItemClasses.test.ts
```

The mirror follows wherever the source sits — a page-scoped hook under
`src/pages/<page>/hooks/` is tested at `src/__tests__/pages/<page>/hooks/`. See `file-placement`.
Type-only files (`src/types/components/*`, `src/types/storage/*`, props types) have no
runtime and no test; they are excluded from coverage.

Shared test helpers live in `src/__tests__/utils/` (not `*.test.*`, so not collected):
`renderWithProviders.tsx` (QueryClient with `retry: false`, i18n in French, `MemoryRouter`
with `initialPath`), `createTestQueryClient`, `memoryKeyValueStorage.ts`, `getDeepKeys.ts`.

## jsdom shims

`src/__tests__/setup.ts` loads `@testing-library/jest-dom/vitest` and shims
`window.matchMedia` (HeroUI's `Toast.Provider` reads it; jsdom has none).
Add a shim there — never in a test file — when a HeroUI / React Aria component needs a
browser API jsdom lacks.

## Mapper Tests — Required Cases

Every mapper must cover:
1. All fields present → correct mapping
2. All fields missing → defaults applied
3. Partial fields → present fields mapped, missing → defaults
4. Null/undefined values → defaults
5. Falsy-but-valid values (`0`, `""`) → not overridden by defaults

## Component Tests — Pattern

Render the **real** HeroUI components — they are React Aria, they work in jsdom, and a
mocked `Select` would hide exactly the behaviour under test. Drive them like a user:

```tsx
const onSelectUser = vi.fn();

const renderSelect = (selectedUserId = DemoUserIdEnum.ALICE) =>
  renderWithProviders(<DemoUserSelect selectedUserId={selectedUserId} onSelectUser={onSelectUser} />);

beforeEach(() => vi.clearAllMocks());

it("reports the chosen user", async () => {
  const user = userEvent.setup();
  renderSelect();

  await user.click(screen.getByRole("button", { name: /Utilisateur courant/ }));
  await user.click(screen.getByRole("option", { name: "Carol (utilisateur 3)" }));

  expect(onSelectUser).toHaveBeenCalledWith(DemoUserIdEnum.CAROL);
});
```

- Define a `renderComponent`-style helper with default props spread
- Clear mocks in `beforeEach`
- Mock the data layer (service, query hook), not the design system. Mock `@heroui/react`
  only to assert a side effect that has no DOM, e.g. `toast.danger` in `DisplayError`
- Assertions use the French copy (the default language) or the key's value read from `fr.json`
- Mock factories have hoisting rules of their own — see `mocking-conventions`

## What to assert

| Subject | What to assert |
|---------|----------------|
| Mappers | Field mapping and the five edge cases above |
| Hooks | State transitions and async flows (`renderHook` with a `QueryClientProvider` wrapper) |
| Components | User interactions and accessible output — queried by role and accessible name, not by internal structure or HeroUI class names |
| Services | URL, method, body, the `DisplayError` call (once) and the fallback / rethrow |

Avoid brittle snapshots. A test that only re-encodes the implementation catches nothing.
