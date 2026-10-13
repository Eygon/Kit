---
name: mapper-composition
description: A mapper delegates nested objects and collections to the child's own mapper — child === null ? null : toChildDto(child), items.map(toItemDto) — never re-inlines a child's fields
metadata:
  type: project
---

# Mapper Composition

```ts
import type { User } from "@/modules/users/entities/user.entity";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { toUserDto } from "@/modules/users/mappers/user.mapper";

interface TastingWithAuthor {
  readonly id: number;
  readonly author: User | null;
  readonly tags: readonly { readonly label: string }[];
}

interface TastingDto {
  readonly id: number;
  readonly author: UserDto | null;
  readonly tags: readonly string[];
}

export const toTastingDto = (entity: TastingWithAuthor): TastingDto => ({
  id: entity.id,
  author: entity.author === null ? null : toUserDto(entity.author),
  tags: entity.tags.map((tag) => tag.label),
});
```

- Nested object → the child's exported mapper, guarded for `null`.
- Collection → `.map(toChildDto)`; an absent collection maps to `[]`.
- A child's mapping lives in exactly one mapper; changing it touches one file.
- Importing another module's mapper is allowed (mappers are pure); importing its
  repository is not ([[service-composition]]).

See [[manual-mappers]], [[mapper-preloaded-relations]].
