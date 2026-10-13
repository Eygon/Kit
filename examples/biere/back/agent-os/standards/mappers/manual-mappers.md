---
name: manual-mappers
description: Entity <-> DTO mapping is hand-written pure exported arrow functions in mappers/<name>.mapper.ts — to<Name>Dto(entity) for reads, toNew<Name>(dto, ...) / to<Name>Changes(dto) for writes; no class-transformer instanceToPlain, no AutoMapper-like library, no mapping inline in a repository or service
metadata:
  type: project
---

# Manual Mappers

```ts
export const toUserDto = (entity: User): UserDto => ({
  id: entity.id,
  displayName: entity.displayName,
  avatarColor: entity.avatarColor,
});
```

```ts
export const toNewBeer = (dto: CreateBeerDto, ownerId: number): Omit<Beer, "id"> => ({
  name: dto.name.trim(),
  style: dto.style,
  abv: dto.abv,
  description: dto.description ?? null,
  ownerId,
});
```

| Direction | Name | Signature |
|---|---|---|
| entity → read DTO | `to<Name>Dto` | `(entity: Name) => NameDto` |
| create DTO → entity data | `toNew<Name>` | `(dto: CreateNameDto, ...serverFields) => Omit<Name, "id">` |
| patch DTO → partial changes | `to<Name>Changes` | `(dto: UpdateNameDto) => Partial<Omit<Name, "id" \| ...>>` ([[optional-patch]]) |

- Pure functions, no class, no state, no injection, no I/O — trivially unit-tested.
- Every field is listed explicitly: never `{ ...entity }` (it would leak a new column to
  the API the day it is added).
- Server-owned values (`ownerId`, dates) are parameters, never read from the DTO.
- The repository calls the mapper at its boundary ([[repository-pattern]]); controllers
  never map.
- One mapper file per entity in the module's `mappers/` folder.

See [[mapper-composition]], [[mapper-null-defaults]].
