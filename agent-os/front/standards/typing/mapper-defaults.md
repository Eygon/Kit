---
name: mapper-defaults
description: DTO→model mappers resolve all nullability with type-appropriate defaults (null/""/0/false/[]); model fields stay concrete
metadata:
  type: project
---

# Mapper Defaults at the DTO→Model Boundary

For plain DTO→model mappers, the mapper is where nullability is resolved. DTO fields are
optional (unstable API contract); model fields are concrete (no `?`). Every optional DTO
field gets a type-appropriate default:

| Model field type      | Default        |
|-----------------------|----------------|
| list                  | `?? []`        |
| boolean               | `?? false`     |
| optional id / ref     | `?? null`      |
| required numeric id   | `?? 0`         |
| required string       | `?? ""`        |

```ts
export const FavoriteReasonDtoToModel = (dto: FavoriteReasonDto): FavoriteReason => ({
    id: dto.id,
    label: dto.label ?? null,
    isActive: dto.isActive ?? false,
    creationDate: dto.creationDate
});
```

- Why: the mapper amortizes backend nullability changes; consumers never handle `undefined`.
- Don't push `?? default` into components or hooks — resolve it in the mapper.
- Required fields the API always sends (ids, dates) pass through without `??`.
- **Exception — `Param`-backed referential models:** types extending `Param` resolve their defaults in the class constructor (`?? default`), not in a mapper — see `typing/param-base-class`.
