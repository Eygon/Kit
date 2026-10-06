---
name: mobile-performance
description: Mobile GPU/CPU budget
---

# Mobile performance

- `renderer.setPixelRatio(min(devicePixelRatio, MAX_PIXEL_RATIO))`; adaptive quality may drop it further when frame time exceeds budget.
- Static map geometry merged per material (`BufferGeometryUtils.mergeGeometries`) or instanced; aim under ~150 draw calls in the busiest room.
- Zombies share geometries/materials; use `InstancedMesh` or shared parts, not a unique material per zombie.
- At most 4 dynamic point/spot lights; one shadow-casting light at most (or baked-looking fake shadows via darkened floor decals).
- Canvas-generated textures at 512px max, `generateMipmaps` on, reused across meshes.
- Post-processing limited to cheap passes (vignette/color grading in a single full-screen pass) or none on low quality.
