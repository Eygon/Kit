---
name: query-input-safety
description: Client input never shapes SQL — sort keys go through a validated enum + static Record whitelist of FindOptionsOrder, QueryBuilder uses named parameters only, and LIKE searches escape \ % _ with ESCAPE '\'
metadata:
  type: project
---

# Query Input Safety

**Sorting** — the client picks a key from an enum (validated by `@IsEnum` in the query DTO,
[[dto-validation]]); a static map turns it into TypeORM order options.

```ts
const SORT_ORDERS: Readonly<Record<BeerSortEnum, FindOptionsOrder<Beer>>> = {
  [BeerSortEnum.NAME]: { name: "ASC", id: "ASC" },
  [BeerSortEnum.ABV]: { abv: "DESC", id: "ASC" },
};

const entities = await this.beers.find({ order: SORT_ORDERS[sort] });
```

**Contains-search** — escape the `LIKE` wildcards and bind the pattern as a parameter.

```ts
async searchByName(term: string): Promise<BeerDto[]> {
  const escaped = term.replace(/[\\%_]/g, (character) => `\\${character}`);
  const entities = await this.beers
    .createQueryBuilder("beer")
    .where("beer.name LIKE :pattern ESCAPE '\\'", { pattern: `%${escaped}%` })
    .orderBy("beer.name", "ASC")
    .getMany();
  return entities.map(toBeerDto);
}
```

- A client string never reaches `orderBy(...)`, `where("..." + x)` or a column name.
- `QueryBuilder` values always go through named parameters (`:pattern`), never template
  literals inside the SQL fragment.
- SQLite `LIKE` is case-insensitive for ASCII only; accent-insensitive search needs a
  normalized column — decide it in the spec, don't improvise per query.
- The secondary sort on `id` keeps pages stable.
