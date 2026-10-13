---
name: optional-patch
description: PATCH DTOs make every field optional; undefined = not sent (keep), null = clear (only for nullable columns, via @IsOptional), a non-nullable field uses @ValidateIf(isSupplied) so null is rejected; an all-absent payload is a 400 from the service via hasAnySuppliedValue
metadata:
  type: project
---

# Optional PATCH

TypeScript has no `Optional<T>`: **`undefined` means "not sent", `null` means "clear it"**.

```ts
const isSupplied = (_dto: object, value: unknown): boolean => value !== undefined;

export class UpdateBeerDto {
  @ValidateIf(isSupplied)
  @IsString()
  @IsNotEmpty()
  @MaxLength(BEER_NAME_MAX_LENGTH)
  readonly name?: string;

  @ValidateIf(isSupplied)
  @IsNumber()
  @Min(0)
  @Max(BEER_ABV_MAX_PERCENT)
  readonly abv?: number;

  @IsOptional()
  @IsString()
  @MaxLength(BEER_DESCRIPTION_MAX_LENGTH)
  readonly description?: string | null;
}

export const hasAnySuppliedValue = (dto: UpdateBeerDto): boolean =>
  Object.values(dto).some((value) => value !== undefined);
```

- **Non-nullable column** → `@ValidateIf(isSupplied)`: absent is skipped, `null` is
  validated and rejected (`name must be a string`). Plain `@IsOptional()` would let `null`
  through and crash on the NOT NULL column.
- **Nullable column** → `@IsOptional()`: absent and `null` both pass; `null` clears.
- Test "supplied" with `!== undefined`, never with `in` or truthiness: the DTO instance
  declares every field, and `0` / `""` / `false` are real values.
- The mapper copies only supplied fields:

```ts
export const toBeerChanges = (dto: UpdateBeerDto): Partial<Omit<Beer, "id" | "ownerId">> => ({
  ...(dto.name !== undefined && { name: dto.name.trim() }),
  ...(dto.abv !== undefined && { abv: dto.abv }),
  ...(dto.description !== undefined && { description: dto.description }),
});
```

- A no-op PATCH (`{}`) is rejected by the service with
  `BadRequestException("At least one field must be supplied.")` when the feature says so
  ([[service-validation]]).
- PATCH answers 200 with the full updated read DTO ([[http-status-codes]]).
