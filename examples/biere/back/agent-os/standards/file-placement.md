---
name: file-placement
description: Place every file at the narrowest scope that consumes it — inside the feature module (dtos/, entities/, mappers/, enums/, <name>.constants.ts) by default; promote to src/common/ only when a second module needs it; config in src/config/, database plumbing in src/database/
metadata:
  type: project
---

# File Placement — narrowest scope of consumption

| Consumed by… | Place it in… |
|---|---|
| One module | that module: `src/modules/<name>/{dtos,entities,mappers,enums}/` or `<name>.constants.ts` |
| Two or more modules / the whole HTTP layer | `src/common/<topic>/` (`exceptions/`, `filters/`, `pipes/`, `security/`, `uploads/`) |
| Environment configuration | `src/config/` |
| The TypeORM connection, seeding | `src/database/` |
| The application shell | `src/app.module.ts`, `src/app.setup.ts`, `src/app.constants.ts`, `src/bootstrap.ts`, `src/main.ts` |
| A test helper | `src/__tests__/support/` |

- Default to the module. Do not put a DTO, an enum or a constant in `src/common/` "because it
  might be reused" — promote it the day a second module imports it, in the same commit.
- Another module's **service** is consumed by importing its module
  ([[service-composition]]); its DTO types and mappers may be imported directly (they are
  pure). Its repository and entity never are.
- Never reach into another module's private helpers; if you need one, promote it.
- The mirror test of a file sits at the same relative path under `src/__tests__/`
  ([[testing-conventions]]).

See [[module-structure]].
