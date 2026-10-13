---
name: nested-mapping-helpers
description: Convert nested DTO fields/arrays with local non-exported helpers composed in the main mapper; compose existing exported mappers for typed-triad sub-objects; export EMPTY_* default instances; promote to a dedicated triad only when reused elsewhere
metadata:
  type: project
---

# Nested Mapping Helpers

When a DTO has nested DTO fields or arrays of DTOs, convert each with a small **local helper** (`const xDtoToModel = …`, not exported) composed inside the main mapper.

```ts
const aromaDtoToModel = (dto: AromaDto): Aroma => ({
  code: dto.code,
  intensity: dto.intensity ?? 0,
});

export const tastingDtoToModel = (dto: TastingDto): Tasting => ({
  id: dto.id,
  beerId: dto.beerId,
  rating: dto.rating ?? 0,
  notes: dto.notes ?? "",
  aromas: (dto.aromas ?? []).map(aromaDtoToModel),
  tastedAt: dto.tastedAt,
});
```

- Keeps the primary mapper flat; each helper owns **one** sub-object / list element and its own `?? default`s
- Reuse the helper across `.map()` for arrays of nested DTOs
- **Promote** a nested conversion to its own exported triad (`typing/model-dto-mapper`) only when the sub-type has its own model/dto and is consumed by other domains (`file-placement`) — otherwise keep it local

## Compose existing mappers

When the nested type **already has its own triad**, import its exported mapper instead of re-duplicating the conversion:

```ts
import { userDtoToModel } from "@/types/mappers/user/userMapper";

author: dto.author ? userDtoToModel(dto.author) : null,
```

Local helper for a one-off sub-shape; imported exported mapper for a type with its own triad — never re-duplicate.

## Default instance constants

Export a canonical default instance of the model alongside the mapper (`EMPTY_X`) for
initial state and fallbacks when the DTO is absent. Co-located with the mapper because it
tracks the model shape.

```ts
export const EMPTY_TASTING: Tasting = { id: 0, beerId: 0, rating: 0, notes: "", aromas: [], tastedAt: "" };
```
