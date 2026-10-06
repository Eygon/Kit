---
name: logic-tests
description: Mirror tests for every logic module, seeded and outcome-based
---

# Logic tests

- `src/logic/x.ts` has `src/__tests__/logic/x.test.ts`.
- Use `createRandom(<fixed seed>)` and step the simulation explicitly (`for (let i = 0; i < 60; i++) update(state, 1 / 60, input, random)`).
- Assert outcomes: points balance, round number, zombie alive/dead, door open, weapon owned. Not internal calls.
- Presentation code (render/audio/ui) is tested only where it holds non-trivial pure helpers (layout math, text formatting).
