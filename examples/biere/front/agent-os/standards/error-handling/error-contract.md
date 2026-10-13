---
name: error-contract
description: The backend answers errors as JSON { message } with a meaningful status (401 -> 400 -> 404 -> 403 -> 409); the client keeps only HttpError(status, message) and the UI copy comes from the status via i18n keys, never from the backend message; narrow unknown errors with instanceof, never any
metadata:
  type: project
---

# Backend Error Contract

The NestJS backend (`.sk/repos.json` → `backend`) answers every error with a stable JSON
body and a meaningful status:

```json
{ "message": "Beer 42 not found" }
```

| Status | When (backend check order) | Front key |
|---|---|---|
| 401 | `X-User-Id` missing, not numeric or <= 0 | `errors.unauthorized` |
| 400 | DTO validation failed (whitelist, forbidNonWhitelisted) | `errors.badRequest` |
| 404 | resource not found | `errors.notFound` |
| 403 | the current user may not act on this resource | `errors.forbidden` |
| 409 | state conflict (duplicate, already done) | `errors.conflict` |
| 413 | upload above 5 MB | `errors.payloadTooLarge` |
| other | — | `errors.generic` |

- On the client the error is an `HttpError` (`src/api/httpError.ts`): `status` and a
  `message` (the response `statusText`). `httpClient` throws it for any non-2xx answer.
- **The UI copy comes from the status**, through `getErrorTranslationKey` and `t()` — the
  backend `message` is English developer text, never rendered.
- A screen that needs a finer distinction (two different 409s) maps it in its own resolver
  passed to `DisplayError(error, resolveKey)` — it does not parse the message string.
- Catch blocks receive `unknown`. Narrow with `error instanceof HttpError` (only inside
  `getErrorTranslationKey` or a resolver); everywhere else pass the raw `unknown` straight
  to `DisplayError`. Never `catch (error: any)`.
- A new status the backend starts emitting is a new `HttpStatusCodeEnum` member, a new
  case in `getErrorTranslationKey` and a new `errors.*` key in `fr.json` and `en.json`.
