---
name: enums
description: One enum per <name>.enum.ts file in the module's enums/ folder (src/common/ when shared), mandatory Enum suffix, SCREAMING_SNAKE_CASE members, string values in lower camelCase for the JSON contract, stored as simple-enum and validated with @IsEnum; guards and Record maps co-located
metadata:
  type: project
---

# Enums

## Location & files

- `src/modules/<name>/enums/<kebab-name>.enum.ts`, one enum per file:
  `health-status.enum.ts` → `HealthStatusEnum`.
- An enum used by several modules moves to `src/common/enums/` ([[file-placement]]).

## Naming

```ts
export enum HealthStatusEnum {
  OK = "ok",
}

export enum BeerStyleEnum {
  IPA = "ipa",
  STOUT = "stout",
  LAGER = "lager",
}
```

- The type always ends with `Enum`; members are `SCREAMING_SNAKE_CASE`
  (`IN_PROGRESS`, `PALE_ALE`).
- Values are **strings** — they travel in JSON to the front and are stored in SQLite —
  in lower camelCase (`"ok"`, `"paleAle"`). The front declares the same values verbatim.
- A numeric enum only for a bounded set whose numbers are the contract (rare). A single
  value is a constant, not a one-member enum… except a closed contract value set that will
  grow, like `HealthStatusEnum`.

## Using it

- Entity column: `@Column({ type: "simple-enum", enum: BeerStyleEnum })` ([[entities]]).
- Write DTO / query DTO: `@IsEnum(BeerStyleEnum)` ([[dto-validation]]).
- Read DTO: typed with the enum (`readonly style: BeerStyleEnum`).

## One representation per concept

Before adding an enum, grep for the concept — a string union in one file and an enum in
another is the bug this rule prevents. Derive unions from the enum if needed:
`` type BeerStyle = `${BeerStyleEnum}` ``.

## Co-locate derived data

Guards, option lists and `Record<XxxEnum, T>` maps live in the enum's file when they are
about the enum itself:

```ts
export const isBeerStyle = (value: string): value is BeerStyleEnum =>
  Object.values(BeerStyleEnum).includes(value as BeerStyleEnum);
```
