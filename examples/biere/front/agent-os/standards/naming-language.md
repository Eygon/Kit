---
name: naming-language
description: English-only for code identifiers (components, folders, files, hooks, vars, types), with explicit verbatim exceptions for backend contract values and route URL segments
metadata:
  type: project
---

# Naming Language — English only for code

Every identifier you author is English: components, folders, files, hooks, variables,
functions, types, props, test names. No French, ever, in code you write — even though the
product, the backlog and the UI copy are French.

A French identifier is a bug even when it compiles. `Bieres` / `degustations/` sitting
next to an English model `Beer` / `Tasting` is the canonical mistake — see
**Consistency** below.

## Verbatim exceptions — keep, do NOT translate

These are external contracts, not identifiers you own. Translating them breaks the
mapping or the URL:

| Kind | Example | Why kept |
|------|---------|----------|
| Route URL segment | `RoutePathEnum.MAP = "/carte"`, `PROFILE = "/profil"` | Public/bookmarked URL; renaming is a breaking route change |
| Backend contract value | a status string the API emits (`"brouillon"`) | Matches a string the backend emits; renaming breaks the lookup |
| API-returned business data | a beer `style` or `name` whose value is French | The value is data, not an identifier |
| Translation values | `fr.json` content | Copy, not code |

Rule of thumb: if the string must equal something a backend or a browser already
knows, keep it verbatim. If it is a name *you* chose, it is English
(`MapPage` for the `/carte` route, `JournalPage` for `/journal`).

## Consistency with the model

When the model/DTO is English (`Tasting`, `TastingDto`), the screen, folder, and component
that carry it must be English too (`tastings/`, `TastingList`). A mismatch between an
English data type and a French folder/component is a rename, not a style preference.

## No redundant segments

A name must not stutter or repeat a segment already implied by its scope. A search bar under
`beerSearch` is `beerSearchBar`, never `beerSearchSearch`. Names are meaningful, not
mechanical concatenations.

## Renaming a French identifier

- Rename the component identifier and its file together (`Degustations` →
  `Tastings`, `degustations.tsx` → `tastings.tsx`).
- Rename the owning folder and its mirrored `__tests__/` folder; use `git mv` so the
  rename is tracked (create the destination directory first if `git mv` reports
  "No such file or directory").
- Update every import path, then leave the verbatim exceptions above untouched.
