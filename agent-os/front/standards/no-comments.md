---
name: no-comments
description: Production code carries no explanatory comments — the name, the type or an extracted function says it instead; the only survivors are the JSDoc that constants requires and a machine-read directive
metadata:
  type: project
---

# No Comments

Code in `src/` ships **without explanatory comments**. A comment is a signal that a
name, a type or a boundary is missing — fix that instead.

```tsx
// ❌ the comment carries what the code should
// Design: design.md#C11 — groups are separated by a right border, except the last one.
const Group = ({ isLast, children }: GroupProps) => ...

// ✅ the name carries it
const TotalsGroupSeparatedByBorder = ...
// or the intent moves into a named constant
const GROUP_SEPARATOR_CLASSES = "mr-[18px] border-r border-(--neutral-00)/16";
```

## What to do instead

| You were about to comment | Do this |
|---|---|
| What a block does | Extract it into a named function or component (see `react/file-decomposition`) |
| What a magic value means | Name it — `xxxConstants.ts`, `SCREAMING_SNAKE_CASE` (see `constants`) |
| Which spec / design / US a line implements | Put it in the commit message and the PR, never in the file |
| A `TODO` / debt note | Open a work item; a comment nobody reads is not a tracker |
| Why a surprising branch exists | Name the branch: `isLegacySalesforceQuirk`, `hasNoServerSideTotals` |

## The two exceptions

- **`constants`** requires a JSDoc tracing a backend/legacy ID to its source. That rule
  wins — it documents an external fact the code cannot express.
- **Machine-read directives** (`@ts-expect-error`, `eslint-disable-next-line`,
  `@vitest-environment`, a license header) are instructions to a tool, not prose.

Nothing else. Not a section banner, not a `//` above an import block, not a restated
signature.

## Tests

The same rule applies. A test that needs a comment to be understood needs a better
`it(...)` description instead.
