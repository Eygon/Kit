---
name: naming-language
description: English-only for every identifier (files, folders, classes, functions, variables, DTO fields, table and column names, enum members, test names); French or other languages only as verbatim data — seed values, user-facing content, external contract values
metadata:
  type: project
---

# Naming Language — English only for code

Every identifier you author is English: modules, folders, files, classes, methods,
variables, DTO fields (the JSON contract), entity tables and columns, enum members,
constants, `describe`/`it` sentences. The product is French ("Mousse", "Carte",
"Journal"); the code is not.

```ts
// ❌
export class BieresService { getBiere(id: number) { ... } }
@Entity({ name: "degustations" })

// ✅
export class BeersService { getBeer(id: number) { ... } }
@Entity({ name: "tastings" })
```

## Verbatim exceptions — keep, do NOT translate

| Kind | Example | Why kept |
|---|---|---|
| Data | a beer named `"Bière de garde"`, a seed description | It is content, not an identifier |
| External contract value | a code an external API returns, a front route segment | Renaming breaks the contract |
| Product name | `Mousse`, `data/mousse.db` | Proper noun |

## Consistency

The feature word is the same everywhere: folder `tastings/`, entity `Tasting`, table
`tastings`, DTO `TastingDto`, route `/api/v1/tastings`, front model `Tasting`. Agree on the
English word in the spec before the first file.

## No redundant segments

Names don't stutter: `BeersService.getBeer`, not `BeersService.getBeerFromBeers`;
`dtos/create-beer.dto.ts`, not `dtos/create-beer-dto.dto.ts`.
