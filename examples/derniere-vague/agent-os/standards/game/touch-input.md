---
name: touch-input
description: Mobile-first touch controls mapped to abstract actions
---

# Touch input

- Input devices write into one `InputState` (`move: {x, y}`, `look: {dx, dy}`, `fire`, `aim`, `reload`, `interact`, `swap`, `sprint`) read by logic each step; logic never reads touches or keys.
- Left half: floating virtual stick (appears where the thumb lands). Right half: drag to look, with sensitivity in config. Buttons on the right: fire (large), aim, reload, interact (shown only when an interaction is available), weapon swap.
- Hit areas >= 48px, multi-touch tracked by `pointerId`, `touch-action: none`, no page scroll or zoom.
- Desktop fallback: WASD + mouse (pointer lock), click fire, right click aim, R reload, E interact, wheel/1-2 swap — mapped to the same `InputState`.
