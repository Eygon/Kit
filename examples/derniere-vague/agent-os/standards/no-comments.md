---
name: no-comments
description: Production code carries no explanatory comments
---

# No comments

Production code under `src/` (tests excepted) has no explanatory `//` or `/* */` comment. If a
line needs explaining, extract a named function or constant. Survivors: `eslint-` / `@ts-`
directives only.
