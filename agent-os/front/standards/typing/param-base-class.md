---
name: param-base-class
description: Param base class for referential types mapped to backend param tables
metadata:
  type: project
---

# Param Base Class

`Param` is the base class for all referential types backed by a param table in the database (`id`, `index`, `name`).

```ts
// src/types/models/param/param.ts
export default class Param {
  id: number;
  index: string;
  name: string;
  translationCode?: string | null;
  constructor(data: Partial<Param> = {}) { ... }
}
```

- Extend `Param` when the type maps to a backend param table
- Use `Partial<T> = {}` in constructors with `?? defaultValue` fallbacks
- Do not extend `Param` for non-referential types (accounts, events, forms...)
