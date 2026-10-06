---
name: naming-language
description: English-only for code identifiers (components, folders, files, hooks, vars, types), with explicit verbatim exceptions for backend contract values and route URL segments
metadata:
  type: project
---

# Naming Language — English only for code

Every identifier you author is English: components, folders, files, hooks, variables,
functions, types, props, test names. No French, ever, in code you write.

A French identifier is a bug even when it compiles. `MotifsFavoris` / `motifsFavoris/`
sitting next to an English model `FavoriteReason` is the canonical mistake — see
**Consistency** below.

## Verbatim exceptions — keep, do NOT translate

These are external contracts, not identifiers you own. Translating them breaks the
mapping or the URL:

| Kind | Example | Why kept |
|------|---------|----------|
| Backend contract value | `viewModel: "GestionMotifsFavorisViewModel"` | Matches a string the API/backend emits; renaming breaks the lookup |
| Route URL segment | `path: "motifs-favoris"` | Public/bookmarked URL; renaming is a breaking route change |
| API-returned business keys | a `code`/`label` field whose value is French | The value is data, not an identifier |

Rule of thumb: if the string must equal something a backend or a browser already
knows, keep it verbatim. If it is a name *you* chose, it is English.

## Consistency with the model

When the model/DTO is English (`FavoriteReason`, `favoriteReasonDto`), the screen,
folder, and component that carry it must be English too (`favoriteReasons/`,
`FavoriteReasons`). A mismatch between an English data type and a French folder/component
is a rename, not a style preference.

## No redundant segments

A name must not stutter or repeat a segment already implied by its scope. A search bar under
`advancedFolderSearch` is `advancedFolderSearchBar`, never `advancedFolderSearchSearch`.
Names are meaningful, not mechanical concatenations.

## Renaming a French identifier

- Rename the component identifier and its file together (`MotifsFavoris` →
  `FavoriteReasons`, `motifsFavoris.tsx` → `favoriteReasons.tsx`).
- Rename the owning folder and its mirrored `__tests__/` folder; use `git mv` so the
  rename is tracked (create the destination directory first if `git mv` reports
  "No such file or directory").
- Update every import path, then leave the verbatim exceptions above untouched.
