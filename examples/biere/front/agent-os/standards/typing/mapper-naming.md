---
name: mapper-naming
description: Naming conventions for mapper functions (xDtoToModel, xToSaveDto, buildXDto, xToSelectOptions) and their placement
metadata:
  type: project
---

# Mapper Naming Conventions

Where a mapper lives follows `file-placement` (narrowest scope of consumption):

- A mapper for an **API-bound domain type** (`userDtoToModel`, `tastingToSaveDto`) is shared
  data-layer plumbing → top-level `src/types/mappers/<domain>/` (the type/contract layer).
- A mapper **specific to one page** (e.g. a form `formValuesToNewTasting` over that page's
  `FormValues`) lives at that page's scope → `src/pages/<page>/utils/`, promoted to top-level
  only when a second consumer at a wider scope appears.

**Primary conversion functions** — camelCase, named by direction and write shape:
- `xDtoToModel(dto: XDto): X` — read: API response → frontend model
- `xToSaveDto(model: X): SaveXDto` — write (create): full payload, all fields present — see `typing/read-write-dto`
- `buildXDto(values: Partial<FormValues>): UpdateXDto` — write (PATCH): partial payload, omit absent keys — see `typing/partial-update-builder`

**Additional transformation helpers** (same file), free naming, e.g. the options of a
HeroUI `Select`: `beerStylesToSelectOptions(styles: BeerStyle[]): SelectOption[]`
(`{ id, label }`, sorted with `localeCompare` when the API order is not guaranteed).

All mapper functions are named exports (`export const`), never default exports.

```ts
// src/types/mappers/user/userMapper.ts
export const userDtoToModel = (dto: UserDto): User => ({ ... });
```
