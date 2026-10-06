---
name: no-alloc-hot-path
description: No per-frame allocations in update/render paths
---

# No allocation on the hot path

- Module-level scratch objects: `const tmpDir = new THREE.Vector3();` reused in `update`.
- Zombies, bullets impacts, blood particles, muzzle flashes and damage numbers come from pools created at load (`createPool(size, factory)`), recycled, never `new` + `dispose` per event.
- No `array.map/filter` producing a new array every frame on the hot path; iterate in place.
- Logic state arrays are preallocated or grown rarely (spawn), entries flagged `alive` rather than spliced each frame.
