---
name: scss-escape-hatch
description: Tailwind utilities by default; co-located .scss only to override Septeo component internals, always @use variables and reuse var(--token)
metadata:
  type: project
---

# SCSS Escape Hatch

Tailwind utilities by default. A co-located `.scss` is the only exception, allowed
solely to override Septeo component internals that utilities cannot target.

```scss
// labelWithQuantity.scss
@use "@src/variables" as *;

.label-with-quantity .field-input {     // internal class of a @septeo component
  text-align: center;
}
```

- Use only to reach DS-component internal classes (`.field-input`, `.field-error-message`, …)
- One `.scss` co-located with its component; import with `@use "@src/variables" as *`
- Reuse `var(--token)` — never hardcode colors/sizes, even in SCSS
- Anything reachable with utilities stays in `className` — do not create a `.scss` for it
