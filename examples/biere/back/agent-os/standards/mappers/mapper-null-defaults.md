---
name: mapper-null-defaults
description: The read mapper is where nullable columns become the DTO's concrete shape — description ?? "", list ?? [], enum fallback — so read DTOs have no optional or null field unless null is meaningful to the front
metadata:
  type: project
---

# Mapper Null → Default

```ts
export const toBeerDto = (entity: Beer): BeerDto => ({
  id: entity.id,
  name: entity.name,
  style: entity.style,
  abv: entity.abv,
  description: entity.description ?? "",
  ownerId: entity.ownerId,
});
```

- Nullable column (`string | null`) → DTO `string` with `?? ""`; collection → `?? []`;
  a fallback column when the spec gives one (`entity.updatedAt ?? entity.createdAt`).
- Keep `null` in the DTO only when it carries meaning the front must display differently
  ("no rating yet"), and then type it `T | null`, never optional.
- The default lives in the mapper — not in the service, not in the front.
- The write direction keeps `null` (`dto.description ?? null`): absent and cleared are
  stored the same way.

See [[manual-mappers]], [[entities]].
