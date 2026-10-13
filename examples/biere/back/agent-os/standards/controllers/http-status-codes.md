---
name: http-status-codes
description: Every handler declares @HttpCode(HttpStatus.X) — GET/PATCH/PUT 200, POST create 201, DELETE 204 (no body); errors 400/401/403/404/409 come from exceptions in the fixed order 401 → 400 → 404 → 403 → 409; an empty list is 200 [], a missing resource is 404
metadata:
  type: project
---

# HTTP Status Codes

## Success — declared on the handler

| Action | Decorator | Body |
|---|---|---|
| Read (`@Get`) | `@HttpCode(HttpStatus.OK)` | DTO or `DTO[]` |
| Create (`@Post`) | `@HttpCode(HttpStatus.CREATED)` | the created DTO |
| Update (`@Patch` / `@Put`) | `@HttpCode(HttpStatus.OK)` | the updated DTO |
| Delete (`@Delete`) | `@HttpCode(HttpStatus.NO_CONTENT)` | none — the handler returns `Promise<void>` |
| Command without result (`@Post(":id/archive")`) | `@HttpCode(HttpStatus.NO_CONTENT)` | none |

```ts
@Delete(":id")
@HttpCode(HttpStatus.NO_CONTENT)
remove(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) id: number): Promise<void> {
  return this.beersService.deleteBeer(userId, id);
}
```

- `@HttpCode` is written on **every** handler, even when it equals Nest's default — the
  status is part of the contract and a reviewer reads it on the method.
- An **empty collection is `200 []`**, never 204 — the front maps the body directly.
- A **missing resource is 404** (`NotFoundException`), on GET as well as on writes.
  *(Deliberate difference with the .NET reference, which answered 204 on an empty GET.)*

## Errors — thrown, in a fixed order

| Order | Status | Who | Exception |
|---|---|---|---|
| 1 | 401 | `CurrentUserGuard` | `UnauthorizedException(UNIDENTIFIED_USER_MESSAGE)` |
| 2 | 400 | `ValidationPipe` / `ParseIntPipe`, then service shape rules | `BadRequestException` |
| 3 | 404 | service — the target (or a required parent) does not exist | `NotFoundException` |
| 4 | 403 | service — the caller may not act on it | `ForbiddenException` |
| 5 | 409 | service — the change conflicts with existing data | `ConflictException` |
| — | 413 | multer — upload above 5 MB | `PayloadTooLargeException` (thrown by Nest) |
| — | 500 | anything unexpected | hidden behind `Internal error` |

Nest's pipeline gives 1 → 2 for free (guards run before pipes,
[[request-pipeline]]); the service enforces 3 → 4 → 5 ([[service-validation]]). A test
that breaks this order is a bug in the code, not in the test.

See [[exceptions]], [[http-status]].
