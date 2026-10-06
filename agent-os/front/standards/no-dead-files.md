---
name: no-dead-files
description: A file left with nothing but export {} (or no export at all) after a refactor is deleted, not kept as a placeholder — check every import and test before deleting
metadata:
  type: project
---

# No Dead Files

A refactor that moves a type, a component, or a constant out of a file can leave that
file empty behind it — sometimes with an `export {};` stub kept only to make it a
module. Delete the file. It has nothing left to say, and its name keeps showing up in
searches and imports for a reader who has no way to tell it is inert without opening it.

```ts
// ❌ commercialConsoleGrid.ts, kept after its one type moved to commercialConsoleGridHook.ts
export {};

// ✅ the file does not exist
```

## Before deleting

- `grep` every import of the file's path — a stub can still be imported for its side
  effects or a re-export another file forgot to update.
- Re-run `yarn typecheck` after removing it — a real compile error means something
  still depends on it and the refactor that emptied it is incomplete, not the file.

## When this happens

Most often after a `types/` split (see `typing/model-dto-mapper`) or a hook extraction
(see `react/hooks`) moves the last thing a file exported. Delete the source file in the
same commit as the move — an empty file is never a valid end state to leave for later.
