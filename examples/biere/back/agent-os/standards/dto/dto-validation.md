---
name: dto-validation
description: Every write-DTO field carries class-validator decorators (an undecorated field is rejected by forbidNonWhitelisted); required = no ?, type decorator + @IsNotEmpty for strings; optional = ? + @IsOptional first; limits from constants; nested objects @ValidateNested + @Type; the global ValidationPipe answers 400 { message } joined with "; "
metadata:
  type: project
---

# DTO Validation

The global `ValidationPipe` (`src/common/pipes/validation-pipe.factory.ts`) runs with
`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` and
`createValidationException` as factory.

| Need | Decorators |
|---|---|
| Required string | `@IsString() @IsNotEmpty() @MaxLength(X_MAX_LENGTH)` on `readonly name!: string` |
| Required number / integer | `@IsNumber()` / `@IsInt()` + `@Min()` / `@Max()` |
| Required enum | `@IsEnum(XxxEnum)` |
| Optional field | `@IsOptional()` **first**, then the type decorators, on `readonly x?: T` |
| Optional nullable field | `@IsOptional()` (accepts `undefined` and `null`) on `readonly x?: T \| null` |
| Nested object | `@ValidateNested() @Type(() => ChildDto)` |
| Array | `@IsArray() @ArrayMaxSize(X) @IsString({ each: true })` |
| Query number (string in URL) | `@Type(() => Number) @IsInt()` |

```ts
export class BeersQueryDto {
  @IsOptional()
  @IsEnum(BeerSortEnum)
  readonly sort?: BeerSortEnum;
}
```

- **Every property needs at least one class-validator decorator.** With `whitelist`, an
  undecorated property is treated as unknown and the request fails with
  `property x should not exist`.
- Any property the DTO does not declare → **400** (`forbidNonWhitelisted`): the client
  cannot sneak `ownerId` or `id` in.
- The 400 body is `{ "message": "name should not be empty; rating must not be less than 1" }`
  — all constraint messages (nested included) joined with `"; "` ([[error-response]]).
  Keep the default English class-validator messages; don't add a `message:` option unless
  the front needs a specific text.
- Shape rules only. A rule that needs the database or several fields together (unique name,
  "at least one field") belongs to the service ([[service-validation]]).
- Limits are the same constants as the entity columns ([[no-hardcoded-values]]).
