---
name: request-pipeline
description: Nest's fixed request order gives the API its check order — body parser → CurrentUserGuard (401) → ValidationPipe / ParseIntPipe (400) → controller → service (404 → 403 → 409) → HttpExceptionFilter ({ message }); global prefix api/v1 and CORS are set in configureApp
metadata:
  type: project
---

# Request Pipeline

```
request
  → CORS (configureApp)                      origins 5173 / 5174, header X-User-Id
  → express body parser                      malformed JSON → 400
  → guards      CurrentUserGuard (APP_GUARD)  → 401
  → pipes       ValidationPipe (APP_PIPE), ParseIntPipe → 400
  → controller  → service                     → 404 → 403 → 409
  → filter      HttpExceptionFilter (APP_FILTER) → { message } for every error
```

- The order is Nest's, not ours: guards always run before pipes, so **401 precedes 400**
  without any code. Never validate identity in a pipe or a DTO.
- Global providers are declared once, in `AppModule.providers`
  (`APP_GUARD`, `APP_PIPE`, `APP_FILTER`) — not with `app.useGlobalGuards(...)` in
  `bootstrap`, so `Test.createTestingModule({ imports: [AppModule] })` gets the exact
  production pipeline ([[api-tests]]).
- What needs the `INestApplication` instance (global prefix `api/v1`, CORS) lives in
  `configureApp` (`src/app.setup.ts`), called by `bootstrap` **and** by `createTestApp`.
- A body-parser error (malformed JSON) is turned into an `HttpException` by Nest and goes
  through the same filter.

See [[cross-cutting-providers]], [[http-status-codes]].
