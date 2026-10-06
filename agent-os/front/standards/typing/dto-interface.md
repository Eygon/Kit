---
name: dto-interface
description: DTOs are always interfaces; models may be classes or interfaces
metadata:
  type: project
---

# DTO vs Model Shape

**DTOs are always interfaces** — never classes.

```ts
// correct
export default interface OfferTypeDto extends Pick<Param, "id" | "index" | "name"> {
  sortOrder: number | null;
}

// wrong — never use a class for a DTO
export default class OfferTypeDto { ... }
```

**Models** may be classes (when extending `Param` or requiring constructor defaults) or plain interfaces — no strict rule.
