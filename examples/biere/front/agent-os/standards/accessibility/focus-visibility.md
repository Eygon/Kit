---
name: focus-visibility
description: HeroUI components draw their own focus ring; a hand-written interactive element uses focus-visible:focus-ring (HeroUI utility, --focus token); extract it into the element's class constant when reused
metadata:
  type: project
---

# Focus Visibility

Every interactive element shows a focus ring on keyboard focus.

- **HeroUI components** (`Button`, `Select.Trigger`, `Switch`, `Tabs.Tab`, `Link`…) already
  draw it through React Aria's `data-focus-visible` — do not add a second ring, do not
  remove theirs.
- **An element you write** (a router `NavLink`, a native `<a>`) uses HeroUI's `focus-ring`
  utility behind `focus-visible:` — it paints a 2px ring in the `--focus` token (hop green,
  `ui/design-system`) with an offset on `--background`, so it stays visible around a green
  active tab and next to the ink borders:

```tsx
const TAB_BAR_ITEM_BASE_CLASSES =
  "flex min-h-14 min-w-11 flex-col items-center justify-center rounded-xl no-highlight focus-visible:focus-ring";
```

- Use `focus-visible:*` (never `focus:*`) so the ring shows for keyboard, not for a tap.
- `no-highlight` removes the grey iOS/Android tap flash; it is not a focus style and never
  replaces the ring.
- Inside a field, use `focus-visible:focus-field-ring` (no offset), the same ring HeroUI
  inputs use.
- Keep the classes in the element's class constant once reused (see `css/conditional-classes`).
- Never strip the ring (`outline-none` alone) without a visible replacement.
