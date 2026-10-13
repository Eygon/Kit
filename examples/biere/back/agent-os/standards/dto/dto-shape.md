---
name: dto-shape
description: Read DTOs are readonly interfaces (<Name>Dto) with a fully concrete shape; write DTOs are classes (Create<Name>Dto, Update<Name>Dto, <Name>sQueryDto) with readonly decorated fields; one DTO per file in dtos/<kebab-name>.dto.ts; no entity, no id, no owner in a write DTO
metadata:
  type: project
---

# DTO Shape

**Read DTO** — what the API returns. An `interface`, every field `readonly`, no optional
field (the mapper resolves nulls, [[mapper-null-defaults]]).

```ts
export interface UserDto {
  readonly id: number;
  readonly displayName: string;
  readonly avatarColor: string;
}
```

**Write DTO** — what the API accepts. A `class` (the ValidationPipe needs a runtime type),
every field `readonly` and decorated ([[dto-validation]]).

```ts
export class CreateBeerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(BEER_NAME_MAX_LENGTH)
  readonly name!: string;

  @IsEnum(BeerStyleEnum)
  readonly style!: BeerStyleEnum;

  @IsNumber()
  @Min(0)
  @Max(BEER_ABV_MAX_PERCENT)
  readonly abv!: number;

  @IsOptional()
  @IsString()
  @MaxLength(BEER_DESCRIPTION_MAX_LENGTH)
  readonly description?: string | null;
}
```

| DTO | Kind | File |
|---|---|---|
| `BeerDto` | read, interface | `dtos/beer.dto.ts` |
| `CreateBeerDto` | POST body, class | `dtos/create-beer.dto.ts` |
| `UpdateBeerDto` | PATCH body, class, all optional ([[optional-patch]]) | `dtos/update-beer.dto.ts` |
| `BeersQueryDto` | query string, class | `dtos/beers-query.dto.ts` |

- Read and write DTOs are **decoupled**: a write DTO drops server-owned fields (`id`,
  `ownerId`, timestamps) — the owner comes from `@CurrentUserId()`.
- Field names are the JSON contract shared with the front (camelCase, English).
- Collections in read DTOs are always arrays (`readonly tags: readonly string[]`), `[]`
  when empty — never `null`.
- An entity is never a DTO, and a DTO never extends an entity.
- One exported DTO per file; a DTO used by a single module lives in that module's `dtos/`
  ([[file-placement]]).
