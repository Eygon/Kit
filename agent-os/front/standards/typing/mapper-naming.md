---
name: mapper-naming
description: Naming conventions for mapper functions and transformation helpers
metadata:
  type: project
---

# Mapper Naming Conventions

Where a mapper lives follows `file-placement` (narrowest scope of consumption):

- A mapper for an **API-bound domain type** (`XDtoToModel`, `XToSaveDto`) is shared data-layer
  plumbing → top-level `src/types/mappers/<domain>/` (the type/contract layer).
- A mapper **specific to one page** (e.g. a form `buildXDto` over that page's `FormValues`) lives
  at that page's scope → `src/pages/<page>/utils/mappers/`, promoted to top-level only when a
  second consumer at a wider scope appears.

**Primary conversion functions** — name by direction and write shape:
- `XDtoToModel(dto: XDto): X` — read: API response → frontend model
- `XToSaveDto(model: X): SaveXDto` — write (create): full payload, all fields present — see `typing/read-write-dto`
- `buildXDto(values: Partial<FormValues>): UpdateXDto` — write (PATCH): partial payload, omit absent keys — see `typing/partial-update-builder`

`XModelToDto(model: X): XDto` is the **legacy** write name (still found under `src/utils/mappers/`); do not reproduce it — new write mappers use `XToSaveDto` or `buildXDto`.

**Additional transformation helpers** (same file):
- Free naming, e.g. `xToDropdownSelects(items: X[]): DropdownSelect[]`

All mapper functions are named exports (`export const`), never default exports.

```ts
// offerTypeMapper.ts
export const OfferTypeDtoToModel = (data: Partial<OfferTypeDto>): OfferType => ({ ... });
export const offerTypesToDropdownSelects = (offerTypes: OfferType[]): DropdownSelect[] => [ ... ];
```
