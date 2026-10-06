---
name: testing-patterns
description: File structure, mapper test cases, and component test pattern with mocks
metadata:
  type: project
---

# Testing Patterns

The runner is **Vitest** (`yarn test`), configured with `globals: true` — `describe`, `it`,
`expect`, `beforeEach` and `vi` need no import. Mock **types** do: `import type { Mock } from "vitest";`.

## File Structure

Tests mirror the source path under `src/__tests__/`:
```
src/types/mappers/offerType/offerTypeMapper.ts
src/__tests__/types/mappers/offerType/offerTypeMapper.test.ts
```

The mirror follows wherever the source sits — a page-scoped hook under
`src/pages/<page>/hooks/` is tested at `src/__tests__/pages/<page>/hooks/`. See `file-placement`.

## Mapper Tests — Required Cases

Every mapper must cover:
1. All fields present → correct mapping
2. All fields missing → defaults applied
3. Partial fields → present fields mapped, missing → defaults
4. Null/undefined values → defaults
5. Falsy-but-valid values (`0`, `""`) → not overridden by defaults

## Component Tests — Pattern

```tsx
vi.mock("@septeo/septeo-ui-components", () => ({ ... }));

const renderComponent = (props = {}) =>
  render(<MyComponent {...defaultProps} {...props} />);

beforeEach(() => vi.clearAllMocks());
```

- Mock all external UI library imports (`@septeo/septeo-ui-components`)
- Define a `renderComponent` helper with `defaultProps` spread
- Clear mocks in `beforeEach`
- Mock factories have hoisting rules of their own — see `mocking-conventions`

## What to assert

| Subject | What to assert |
|---------|----------------|
| Mappers | Field mapping and the five edge cases above |
| Hooks | State transitions and async flows |
| Components | User interactions and accessible output — queried by role and accessible name, not by internal structure |

Avoid brittle snapshots. A test that only re-encodes the implementation catches nothing.
