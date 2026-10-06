---
name: seeded-random
description: Randomness from an injected seeded generator
metadata:
  checks:
    - re: "Math\\.random\\("
      files: "^src/logic/"
      msg: "Math.random dans la logique (createRandom injecte)"
---

# Seeded random

- Logic receives a `Random` (`src/logic/random.ts`, `createRandom(seed)`) as a parameter or in its state; it never calls `Math.random`.
- Tests pass a fixed seed and assert the exact outcome (box result, spawn point, drop).
- Presentation-only randomness (particle jitter, sound pitch variation) may use its own `createRandom` instance.
