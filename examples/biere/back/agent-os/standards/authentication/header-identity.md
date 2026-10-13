---
name: header-identity
description: Identity is the X-User-Id header (positive integer, demo users 1-3), checked by the global CurrentUserGuard before anything else; missing / non-numeric / <= 0 → 401 with the canonical message. No JWT, no session in this repo.
metadata:
  type: project
---

# Header Identity (X-User-Id)

The caller is identified by the **`X-User-Id`** request header. There is no JWT, cookie
or session: the demo users are Alice (1), Bob (2), Carol (3), seeded by `DataSeeder`.

```ts
// src/common/security/current-user.guard.ts (registered as APP_GUARD in AppModule)
const userId = parseUserId(request.headers[USER_ID_HEADER]);
if (userId === null) {
  throw new UnauthorizedException(UNIDENTIFIED_USER_MESSAGE);
}
request.currentUserId = userId;
```

- `CurrentUserGuard` is **global**: every route requires the header unless it is marked
  `@Public()` ([[public-routes]]).
- `parseUserId` (`src/common/security/parse-user-id.ts`) accepts only a decimal positive
  safe integer (surrounding spaces tolerated). `abc`, `0`, `-1`, `1.5`, `2abc`, a repeated
  header → `null` → **401**.
- The 401 body is always `{ "message": "Unable to identify the currently signed-in user." }`
  (`UNIDENTIFIED_USER_MESSAGE`) — the exact same message everywhere.
- The guard checks the **format** only. A well-formed id that matches no user is not a 401:
  the service answers 404 when it needs the user (`GET /api/v1/users/me` with `99` → 404).
- The header name is `USER_ID_HEADER = "x-user-id"` (Express lower-cases header names);
  CORS allows `X-User-Id` (`CORS_ALLOWED_HEADERS` in `src/app.constants.ts`).
- Guards run before pipes, so a request without identity is a 401 even when its body is
  invalid ([[request-pipeline]]).
- Controllers read the id with `@CurrentUserId()` — never from the body, the query or the
  raw headers ([[current-user-resolution]]).
