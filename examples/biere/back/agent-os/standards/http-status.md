---
name: http-status
description: Use Nest's HttpStatus enum (from @nestjs/common) for every status — @HttpCode, exceptions, tests, filters — never a raw numeric literal
metadata:
  type: project
---

# HTTP Status Codes — use the enum, never the number

```ts
@HttpCode(HttpStatus.NO_CONTENT)

response.status(HttpStatus.INTERNAL_SERVER_ERROR)

expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
```

```ts
// ❌ never
@HttpCode(204)
expect(response.status).toBe(401);
```

- `HttpStatus` from `@nestjs/common` is the single source of truth — don't declare a local
  enum (the front's `HttpStatusCode` is the front's).
- Applies everywhere a status is written or compared: controllers, filters, tests,
  `it.each` tables.
- Which status for which case is [[http-status-codes]].
