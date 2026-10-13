---
name: current-user-resolution
description: A handler gets the caller with @CurrentUserId() userId: number (set by CurrentUserGuard) and passes it to the service as first argument — never from body, query or headers; the user id is never a DTO field
metadata:
  type: project
---

# Current-User Resolution

```ts
@Post()
@HttpCode(HttpStatus.CREATED)
create(@CurrentUserId() userId: number, @Body() dto: CreateBeerDto): Promise<BeerDto> {
  return this.beersService.createBeer(userId, dto);
}
```

- `@CurrentUserId()` (`src/common/security/current-user-id.decorator.ts`) returns the
  `currentUserId` the guard stored on the request ([[request-state]]).
- If it runs without the guard (a `@Public()` route) it throws 401 with
  `UNIDENTIFIED_USER_MESSAGE` — don't combine both.
- The id is the **first** argument of the service method; services never read the request.
- An owner / author / user id is never part of a write DTO: it comes from
  `@CurrentUserId()` ([[resource-access]]).
