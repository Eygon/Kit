---
name: logic-render-split
description: Pure, tested game rules in src/logic; render/audio/ui only read them
metadata:
  checks:
    - re: "from [\"']three[\"']|from [\"']three/"
      files: "^src/logic/"
      msg: "three.js importe dans la logique"
    - re: "\\b(document|window|AudioContext|requestAnimationFrame)\\b"
      files: "^src/logic/"
      msg: "API navigateur dans la logique"
---

# Logic / render split

The game is two layers:

| Layer | Folder | May import | Owns |
|---|---|---|---|
| Logic | `src/logic/` | `src/config`, other logic | state and rules: player, zombies, rounds, points, weapons, doors, box |
| Presentation | `src/render`, `src/audio`, `src/ui`, `src/engine` | logic, config, three, DOM | meshes, sounds, HUD, input devices |

- Logic exposes plain data (`{ x, z, hp }`) and functions `update(state, stepS, input, random)`; it never imports three.js, the DOM or WebAudio.
- Presentation reads logic state each frame and mirrors it (mesh position = zombie position). It never decides a rule (no damage computed in a mesh class).
- Events the presentation needs (shot fired, zombie hit, round started, purchase refused) are emitted by logic as a typed event queue drained each frame: `type GameEvent = { kind: "zombieKilled"; id: number; headshot: boolean } | ...`.
- Geometry questions the logic needs (walls, doors) use a logic-side 2D map (grid or segments), not three.js raycasts.
