---
name: procedural-audio
description: Synthesized WebAudio sounds behind one unlocked context
---

# Procedural audio

- One `AudioContext`, created/resumed on the first user gesture (start button); everything routes to a master gain.
- Each sound is a function `play<Name>(audio, opts)` building short-lived nodes (oscillator / noise buffer + filter + envelope) and stopping them; a voice cap drops the oldest voice beyond the limit.
- Positional sounds (zombie groans, footsteps) use a `PannerNode` updated from the listener (camera) position.
- Music/ambience: generated drones and round-transition stingers, no audio file.
