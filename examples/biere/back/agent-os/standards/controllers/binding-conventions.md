---
name: binding-conventions
description: Bind with explicit decorators — @Body() dto: CreateXDto, @Query() query: XQueryDto, @Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number; body and query types are validated classes, never inline object types or any
metadata:
  type: project
---

# Binding Conventions

```ts
@Patch(":id")
@HttpCode(HttpStatus.OK)
update(
  @CurrentUserId() userId: number,
  @Param("id", ParseIntPipe) id: number,
  @Body() dto: UpdateBeerDto,
): Promise<BeerDto> {
  return this.beersService.updateBeer(userId, id, dto);
}

@Get()
@HttpCode(HttpStatus.OK)
getAll(@Query() query: BeersQueryDto): Promise<BeerDto[]> {
  return this.beersService.getBeers(query.sort);
}
```

- Integer route ids always go through `ParseIntPipe` → a non-numeric id is a 400
  `Validation failed (numeric string is expected)` before the service runs.
- `@Body()` and `@Query()` are typed with a **class** carrying class-validator decorators
  ([[dto-validation]]); an inline type (`@Body() body: { name: string }`) or an interface
  is not validated at runtime and is forbidden.
- Never `@Body("name")` / `@Query("sort")` single-field extraction — it bypasses the DTO.
- Never `@Req()` / `@Headers()` in a controller to read the identity — `@CurrentUserId()`
  ([[current-user-resolution]]).
- Parameter order: `@CurrentUserId()`, then route params, then query, then body — the
  service method takes them in the same order (`updateBeer(userId, id, dto)`).
- File uploads use `FileInterceptor(field, MEMORY_UPLOAD_OPTIONS)` +
  `@UploadedFile() file: Express.Multer.File` — memory storage, 5 MB, one file
  (`src/common/uploads/`).
