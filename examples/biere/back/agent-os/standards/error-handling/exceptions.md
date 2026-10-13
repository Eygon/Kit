---
name: exceptions
description: One choice — services throw Nest's built-in HttpExceptions (BadRequest/NotFound/Forbidden/Conflict/Unauthorized) with an English sentence; no custom exception classes, no try/catch in controllers, no error objects returned; anything else becomes a hidden 500
metadata:
  type: project
---

# Exceptions

**Decision**: the business layer throws **Nest's built-in exceptions** from
`@nestjs/common`. The .NET reference had its own `BadRequestException` /
`ResourceNotFoundException`… mapped by a middleware; in Nest, `HttpException` already *is*
that mapping, so a parallel hierarchy would only duplicate it (and collide with Nest's
names). `src/common/exceptions/` therefore holds the shared messages and the validation
exception factory, not exception classes.

```ts
async getBeer(id: number): Promise<BeerDto> {
  const beer = await this.beersRepository.findById(id);
  if (beer === null) {
    throw new NotFoundException(`Beer ${id} not found.`);
  }
  return beer;
}
```

| Exception (`@nestjs/common`) | Status | Typical thrower |
|---|---|---|
| `UnauthorizedException` | 401 | `CurrentUserGuard`, `@CurrentUserId()` only |
| `BadRequestException` | 400 | `ValidationPipe`, `ParseIntPipe`, service shape rules |
| `NotFoundException` | 404 | service — unknown target or parent |
| `ForbiddenException` | 403 | service — access rule ([[resource-access]]) |
| `ConflictException` | 409 | service — uniqueness / state conflict |
| any other `Error` | 500 | bug — message hidden (`Internal error`) and logged |

- Message: one English sentence ending with a period, naming the resource and its id
  (`Beer 7 not found.`, `A beer named "Nuit" already exists.`). Shared messages are
  constants in `exception-messages.constants.ts`.
- Services and guards throw; **controllers never catch** and never build an error body.
- Never throw a raw `Error` / `TypeError` for a business case — it becomes an opaque 500.
- Never create `class XxxException extends HttpException`: use the built-in that matches
  the status. If a status has no built-in (rare), discuss it first.
- Repositories do not throw HTTP exceptions; they return `null` / `false`
  ([[service-repository-responsibilities]]).

See [[error-response]], [[http-status-codes]].
