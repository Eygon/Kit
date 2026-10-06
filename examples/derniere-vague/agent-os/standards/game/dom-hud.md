---
name: dom-hud
description: DOM HUD over the canvas, updated on change
---

# DOM HUD

- HUD elements (round counter, points, ammo, hit marker, damage vignette, interaction prompt, purchase feedback) are DOM nodes over the canvas created once.
- A HUD update writes to the DOM only when the displayed value changes (compare with last shown value).
- Texts come from `src/ui/texts.ts` (French). Layout respects `env(safe-area-inset-*)` and works in landscape on phones.
- Animations are CSS (transform/opacity), not per-frame JS style writes.
