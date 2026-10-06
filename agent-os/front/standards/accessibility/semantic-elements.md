---
name: semantic-elements
description: Every interactive element is a native control (<button type=button>/<a>/<ol><li>) with aria-current for active items — never a clickable <div onClick>
metadata:
  type: project
---

# Semantic Interactive Elements

Every clickable / interactive thing is a real control — never a `<div onClick>`.

```tsx
<button type="button" onClick={onSelect}>...</button>   // action
<a href={url}>...</a>                                    // navigation
<ol><li aria-current={isCurrent ? "step" : undefined}>  // ordered steps
```

- Action → `<button type="button">` (the `type` prevents accidental form submit)
- Navigation → `<a>` / router link, never a button that pushes a route
- A clickable `<div>`/`<span>` has no keyboard, focus, or role — don't put `onClick` on one
- Lists / steps use `<ol>`/`<ul>`/`<li>`; expose the active item with `aria-current`
- Reach for ARIA roles only when no native element fits — native element first

See also focus-visibility, icons-and-labels.
