---
name: dto-interface
description: DTOs are always named-export interfaces; models are interfaces (classes only when a constructor default is genuinely needed)
metadata:
  type: project
---

# DTO vs Model Shape

**DTOs are always interfaces** — never classes, never `type` aliases, named exports.

```ts
// correct — src/types/dtos/user/userDto.ts
export interface UserDto {
  id: number;
  displayName?: string | null;
  avatarColor?: string | null;
}

// wrong — never use a class for a DTO
export default class UserDto { ... }
```

**Models** are plain interfaces by default (`src/types/models/user/user.ts`); a class is
only acceptable when construction needs real defaults that a mapper cannot express — none
does today.
