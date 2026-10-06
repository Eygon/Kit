---
name: nested-mapping-helpers
description: Convert nested DTO fields/arrays with local non-exported helpers composed in the main mapper; compose existing exported mappers for typed-triad sub-objects; export empty*/EMPTY_* default instances; promote to a dedicated triad only when reused elsewhere
metadata:
  type: project
---

# Nested Mapping Helpers

When a DTO has nested DTO fields or arrays of DTOs, convert each with a small **local helper** (`const xDtoToModel = …`, not exported) composed inside the main mapper.

```ts
const labelRefDtoToModel = (dto: LabelRefDto | undefined): LabelRef | null =>
  dto ? { id: dto.id, label: dto.label ?? null } : null;

const stateDtoToModel = (dto: SupportRequestStateDto, stateId: number): SupportRequestState => ({
  id: dto.id,
  label: dto.label ?? null,
  isCurrent: dto.id === stateId
});

export const SupportRequestDetailDtoToModel = (dto: SupportRequestDetailDto): SupportRequestDetail => ({
  id: dto.id,
  application: labelRefDtoToModel(dto.application),
  states: [...(dto.states ?? [])].map((state) => stateDtoToModel(state, dto.stateId ?? 0))
});
```

- Keeps the primary mapper flat; each helper owns **one** sub-object / list element and its own `?? null` defaults
- Reuse the helper across `.map()` for arrays of nested DTOs
- **Promote** a nested conversion to its own exported triad ([[model-dto-mapper]]) only when the sub-type has its own model/dto and is consumed by other domains ([[file-placement]]) — otherwise keep it local

## Compose existing mappers

When the nested type **already has its own triad**, import its exported mapper instead of re-duplicating the conversion:

```ts
import { UserDtoToModel } from "@utils/mappers/param/userMapper";

author: dto.author ? UserDtoToModel(dto.author) : undefined,
```

Local helper for a one-off sub-shape; imported exported mapper for a type with its own triad — never re-duplicate.

## Default instance constants

Export a canonical default instance of the model alongside the mapper (`emptyX` / `EMPTY_X`) for form/state initial values and fallbacks when the DTO is absent. Co-located with the mapper because it tracks the model shape.

```ts
export const emptyTicket: Ticket = { id: 0, accountId: 0, value: 0, label: "" };
```
