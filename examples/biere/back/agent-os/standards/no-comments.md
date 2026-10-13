---
name: no-comments
description: Production code carries no explanatory comments — the name, the type, a constant or an extracted function says it instead; the only survivors are machine-read directives (eslint-disable-next-line, @ts-expect-error) and the JSDoc that constants requires for an external ID
metadata:
  type: project
---

# No Comments

Code in `src/` ships **without explanatory comments**. A comment is a signal that a name,
a type or a boundary is missing — fix that instead.

```ts
// ❌ the comment carries what the code should
// 0 means "not identified" for the guard
if (userId <= 0) { ... }

// ✅ the name carries it
export const parseUserId = (raw: string | string[] | undefined): number | null => { ... };
```

## What to do instead

| You were about to comment | Do this |
|---|---|
| What a block does | Extract a named function (`readPort`, `getOwnedBeer`) |
| What a magic value means | Name it — `xxx.constants.ts`, `SCREAMING_SNAKE_CASE` ([[constants]]) |
| Which spec / US a line implements | Commit message and PR, never the file |
| A `TODO` / debt note | Open a work item |
| Why a surprising branch exists | Name the branch: `isLegacyImport`, `hasNoTastingYet` |
| A section banner in a class | Split the class |

## The exceptions

- **Machine-read directives** — `// eslint-disable-next-line <rule>` (with the rule
  named), `// @ts-expect-error <reason>` — are instructions to a tool.
- **`constants`** requires a JSDoc tracing an external/legacy ID to its source.

Nothing else: no JSDoc on DTO fields (the DTO name and the class-validator decorators are
the documentation), no `// Arrange / Act / Assert` in tests — a test that needs a comment
needs a better `it(...)` sentence.
