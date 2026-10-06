---
name: service-structure
description: Per-domain default-export class, static async method recipe, mandatory queryFunctions pass-through, DTO-to-model mapping & 204 semantics
metadata:
  type: project
---

# API Service Structure

One class per domain in `src/api/<domain>/<domain>Service.ts`.

- `export default class XxxService` — methods are `static async`, no instance state
- Plain exported functions are legacy (`folderService.ts`) — do not reproduce

Canonical method recipe:

```ts
static async getAll(): Promise<FavoriteReason[]> {
    try {
        const request = await generateRequestConfig();
        const response = await api.get(FAVORITE_REASONS(getSelectedCompany()), request);
        if (response.status === HttpStatusCode.NO_CONTENT) return [];
        return (response.data as FavoriteReasonDto[]).map(FavoriteReasonDtoToModel);
    } catch (error) {
        DisplayError(error);
    }
    return [];
}
```

- `generateRequestConfig()` first (awaited) — injects auth + client headers
- Call the shared `api` instance from `@utils/axios/axiosUtils` — its `transformRequest` auto-serializes `Date` values in the body to `yyyy-MM-dd'T'HH:mm:ss`; pass raw `Date`s, never `toISOString()` or hand-format
- URL from a builder in `@utils/api/apiURL`, scoped with `getSelectedCompany()`
- Map `response.data` (DTO) → model before returning — never return raw DTOs
- Status comparisons (e.g. `NO_CONTENT`) use the `HttpStatusCode` enum, never a raw number (see `http-status`)
- `try/catch` with `DisplayError(error)` (see `api/error-handling`)

A TanStack hook never imports a service directly. It calls a named
pass-through in `src/utils/queryFunctions/<domain>QueryFunctions.ts`
(`fetchXxx`, `createXxx`, `postXxx`, `patchXxx`, `deleteXxx`) that delegates
to the service. This layer is mandatory even when it adds nothing.

## Response mapping & empty responses

`response.data` is always a DTO (or DTO array) — map it through its `DtoToModel`
mapper before returning. DTOs never escape the service — callers receive models
only. (Triad rules: see `typing/model-dto-mapper`.)

204 / empty response, by endpoint shape:

- Collection → `[]` (or `{ items: [], totalCount: 0 }`)
- Single resource → `null`

A `null` may carry distinct business meaning the caller interprets (e.g. a
group number that does not exist) — comment it in the method when it does.
