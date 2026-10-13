---
name: no-dead-files
description: A file (or folder) left with nothing used after a refactor is deleted with its mirror test, not kept as a placeholder — grep imports, run typecheck and the tests before deleting; no empty module sub-folders "for later"
metadata:
  type: project
---

# No Dead Files

A refactor that moves the last export out of a file leaves it inert. Delete it — and
its mirrored test — in the same commit.

```ts
// ❌ src/modules/beers/dtos/beer-filter.dto.ts, kept after the filter moved to BeersQueryDto
export {};

// ✅ the file does not exist
```

## Before deleting

- `grep` every import of the path (`@/modules/beers/dtos/beer-filter.dto`).
- Delete the mirror test `src/__tests__/<same path>.test.ts`.
- `npm run typecheck && npm test` — a compile error means the refactor that emptied the
  file is incomplete.

## Also dead

- An exported function or method nobody calls (except through a test written only to
  cover it) — remove it; YAGNI applies to repositories and services too.
- An empty `enums/` or `mappers/` folder created "to respect the structure" — a folder
  exists when it has a file ([[module-structure]]).
