---
name: focus-visibility
description: Keyboard focus ring via focus-visible:outline with --primary-60 (lighter token on dark bg); extract a focusRing constant when reused
metadata:
  type: project
---

# Focus Visibility

Every interactive element shows a focus ring on keyboard focus.

Use `focus-visible:*` (never `focus:*`) so the ring shows for keyboard, not mouse:

```tsx
const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-60)";
```

- Default outline token: `--primary-60`
- On dark backgrounds use a lighter token (e.g. `--primary-20`) to keep contrast
- Extract the classes into a local `focusRing` constant once reused in a file
- Never strip the ring (`outline-none`) without a visible replacement
