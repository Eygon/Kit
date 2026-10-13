---
name: service-structure
description: Per-domain default-export class, static async method recipe on the shared fetch httpClient, mandatory queryFunctions pass-through, DTO-to-model mapping & 204 semantics
metadata:
  type: project
---

# API Service Structure

One class per domain in `src/api/<domain>/<domain>Service.ts`.

- `export default class XxxService` — methods are `static async`, no instance state
- Plain exported functions calling `fetch` are not a service — do not write them

Canonical method recipe:

```ts
import { httpClient } from "@/api/httpClient";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import type { UserDto } from "@/types/dtos/user/userDto";
import { userDtoToModel } from "@/types/mappers/user/userMapper";
import type { User } from "@/types/models/user/user";
import { USERS } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";

export default class UserService {
  static async getAll(): Promise<User[]> {
    try {
      const response = await httpClient.get<UserDto[]>(USERS());
      if (response.status === HttpStatusCodeEnum.NO_CONTENT || response.data === null) return [];
      return response.data.map(userDtoToModel);
    } catch (error) {
      DisplayError(error);
    }
    return [];
  }
}
```

- Call the shared `httpClient` (`src/api/httpClient.ts`), never `fetch` directly: it sets
  `Accept`, the `X-User-Id` of the current demo user, JSON `Content-Type` + serialization
  of the body, and turns a non-2xx answer into an `HttpError`
- `httpClient.get / post / patch / delete / postForm` return `{ status, data }`; `data` is
  `null` on 204
- Pass dates as ISO strings built by the model mapper — the client does no `Date`
  conversion, and a service never calls `toISOString()` itself (mechanical check)
- URL from a builder in `src/utils/apiURL/apiURL.ts` (see `api/url-builders`)
- Map `response.data` (DTO) → model before returning — never return raw DTOs
- Status comparisons use `HttpStatusCodeEnum`, never a raw number (see `http-status`)
- `try/catch` with `DisplayError(error)` (see `api/error-handling`)
- Optional `{ signal }` as the last argument when the call needs a bound or an abort
  (see `api/request-timeouts`)

A TanStack hook never imports a service directly. It calls a named
pass-through in `src/utils/queryFunctions/<domain>QueryFunctions.ts`
(`fetchXxx`, `createXxx`, `patchXxx`, `deleteXxx`) that delegates
to the service. This layer is mandatory even when it adds nothing:

```ts
import UserService from "@/api/users/userService";

export const fetchUsers = () => UserService.getAll();
```

## Response mapping & empty responses

`response.data` is always a DTO (or DTO array) — map it through its `xDtoToModel`
mapper before returning. DTOs never escape the service — callers receive models
only. (Triad rules: see `typing/model-dto-mapper`.)

204 / empty response, by endpoint shape:

- Collection → `[]`
- Single resource → `null`

A `null` may carry distinct business meaning the caller interprets (e.g. "no tasting yet
for this beer") — name it in the method (`findLatestTasting`), not in a comment.
