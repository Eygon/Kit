---
name: naming-language
description: English identifiers, French player-facing text
---

# Naming and language

- Identifiers, files and folders are English. Files are camelCase (`roundDirector.ts`), types PascalCase.
- One module = one responsibility, named after it (`pointsLedger.ts`, not `utils.ts`).
- Everything the player reads is French and comes from `src/ui/texts.ts` (`TEXTS.round(n)`), never a literal inside a component.
