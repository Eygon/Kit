---
name: tuning-config
description: Gameplay numbers are named config entries with unit suffixes
---

# Tuning config

- Every gameplay number lives in `src/config/` as a named, readonly entry with a unit suffix: `ZOMBIE_WALK_SPEED_MPS`, `DOOR_COST_POINTS`, `ROUND_BREAK_S`, `M1911_DAMAGE`.
- Tables (weapons, doors, box pool) are typed readonly arrays/records in config: `WEAPONS: Record<WeaponId, WeaponSpec>`.
- Logic and render code reference config; a bare tuning literal (`speed = 2.4`) in `src/logic` or `src/render` is a defect. Neutral literals (0, 1, -1, 2 for halves, array indexes) are fine.
- Visual constants (colors, light intensities, mesh sizes) go to `src/config/visualConfig.ts`.
