---
name: procedural-assets
description: No external asset files; everything generated in code
metadata:
  checks:
    - re: "\\.(png|jpe?g|webp|glb|gltf|fbx|obj|mp3|wav|ogg)[\"'`]"
      files: "^src/.*\\.ts$"
      skip: "__tests__/"
      msg: "fichier d asset externe reference"
---

# Procedural assets

- Models: built from three.js primitives (Box, Cylinder, Capsule, Lathe, Extrude) assembled into groups in `src/render/models/`.
- Textures: drawn on a canvas (noise, stains, bricks, wood planks) in `src/render/textures/`, cached by key.
- Sounds: synthesized in `src/audio/` (oscillators, filtered noise, envelopes).
- The production build is a single self-contained `index.html`: no fetch of any asset.
