---
name: strict-types
description: Strict typing rules
---

# Strict types

- No `any`; `unknown` + narrowing at boundaries.
- `noUncheckedIndexedAccess` is on: handle `undefined` from lookups, never `!`.
- States are discriminated unions (`{ phase: "break"; remainingS } | { phase: "active"; ... }`).
- Config objects are `as const` / `readonly`.
