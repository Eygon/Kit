---
name: http-status
description: Use the HttpStatusCodeEnum for HTTP status checks — never a raw numeric literal
metadata:
  type: project
---

# HTTP Status Codes — use the enum, never the number

Compare `response.status` / `error.status` against `HttpStatusCodeEnum`, never a bare
number. A raw `204` or `404` is a magic number: the reader has to remember the spec, and a
typo (`240`) passes type-checking.

```ts
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";

if (response.status === HttpStatusCodeEnum.NO_CONTENT || response.data === null) return [];
```

```ts
// ❌ never
if (response.status === 204) return [];
```

- Import from `@/types/enums/http/httpStatusCodeEnum`.
- This applies everywhere a status code is read or compared — `httpClient`, services,
  `getErrorTranslationKey`, hooks.
- The backend answers 201 on creation, 204 on deletion, and checks in the order
  401 → 400 (validation) → 404 → 403 → 409; the enum carries those members plus 413
  (upload too large) and 500. A missing code is added as a named member there, never
  inlined at the call site.
- Tests may assert the literal value of a status (`toEqual({ status: 204, data: null })`)
  — the rule is about production comparisons.
- This is the single source of truth for the rule — `api/error-handling` and
  `api/service-structure` reference it rather than restating it.
