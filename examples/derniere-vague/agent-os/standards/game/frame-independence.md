---
name: frame-independence
description: Fixed-step simulation, per-second speeds, interpolated render
metadata:
  checks:
    - re: "\\brequestAnimationFrame\\("
      files: "^src/"
      skip: "(^src/engine/|__tests__/)"
      msg: "requestAnimationFrame hors de src/engine"
---

# Frame independence

- Simulation runs only inside the fixed-step `update(stepS)` of `startGameLoop` (`src/engine/gameLoop.ts`).
- Speeds/rates are per second and multiplied by `stepS`: `pos += speed * stepS`.
- Timers are accumulators in seconds decremented by `stepS`, never frame counters.
- Render uses `alpha` / `frameS` only for visuals (interpolation, camera bob, animations), never to change game state.
