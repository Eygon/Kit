---
name: http-status
description: Use the HttpStatusCode enum for HTTP status checks — never a raw numeric literal
metadata:
  type: project
---

# HTTP Status Codes — use the enum, never the number

Compare `response.status` against `HttpStatusCode`, never a bare number. A raw `204`
or `404` is a magic number: the reader has to remember the spec, and a typo (`240`)
passes type-checking.

```ts
import { HttpStatusCode } from "@prjTypes/enums/httpStatusCode";

if (response.status === HttpStatusCode.NO_CONTENT) return [];
```

```ts
// ❌ never
if (response.status === 204) return [];
```

- Import from `@prjTypes/enums/httpStatusCode`.
- This applies everywhere a status code is read or compared — services, axios
  interceptors, error handling.
- If the code you need is missing from the enum, add the named member there rather than
  inlining the number at the call site.
- This is the single source of truth for the rule — other standards (`api/error-handling`,
  `api/service-structure`) reference it rather than restating it.
- The enum is currently named `HttpStatusCode` (no `Enum` suffix) and lives at
  `src/types/enums/httpStatusCode.ts`. Per `enums` it is legacy: when you next touch that
  file, rename it to `HttpStatusCodeEnum` and update its imports. Until then, `HttpStatusCode`
  is the name to use at call sites.
