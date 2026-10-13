---
name: boundary-narrowing
description: Untrusted input (storage, URL params, HeroUI Key values, JSON.parse) enters as unknown then is narrowed via isX/parseX guards; never any
metadata:
  type: project
---

# Boundary Input: unknown then narrow

Untrusted input enters the app typed `unknown` (or as the loose type the API hands you),
never `any`. Narrow before use.

**Sources to narrow:** storage values (`KeyValueStorage.get` → `string | null`), URL
params (`useParams()` → `string | undefined`), a HeroUI selection (`Key | null` =
`string | number | null`), `JSON.parse` results, `postMessage` payloads, file contents.

```ts
const storedId = Number(storage.get(StorageKeyEnum.CURRENT_USER_ID));
return isDemoUserId(storedId) ? storedId : DEFAULT_DEMO_USER_ID;
```

```ts
const handleChange = (key: Key | null) => {
  const userId = Number(key);
  if (isDemoUserId(userId)) onSelectUser(userId);
};
```

## Narrowing: hand-rolled guards

There is no schema library in this repo (no zod): compose small guards.

- Leaf guards use `typeof` / `Array.isArray` / `Number.isInteger`.
- Enum guards live with the enum (`isDemoUserId` in `demoUserIdEnum.ts`, see `enums`).
- Object guards go through `isRecord` first, then check keys.
- `parseX(value: unknown): X | null` returns `null` on failure (`[]` for arrays).

```ts
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStoredDraft = (value: unknown): value is StoredDraft => {
  if (!isRecord(value)) return false;
  return typeof value.beerName === "string" && typeof value.rating === "number";
};

export const parseStoredDraft = (raw: string | null): StoredDraft | null => {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
```

`Record<string, unknown>` is the canonical "arbitrary object" shape — narrow to it (after a
`typeof === "object"` check) to read keys without `any`.

## API responses: direct DTO typing is allowed

`httpClient.get<XDto>(...)` types `response.data` straight as its DTO — the backend contract
is trusted via the model/dto/mapper layer, and the mapper resolves nullability
(`typing/mapper-defaults`). Keep `unknown` only on a genuinely at-risk field, then check it.

```ts
const response = await httpClient.get<{ items?: unknown }>(BEERS());
if (!Array.isArray(response.data?.items)) return [];
```

**Why:** A shape drift on an untrusted source surfaces at the boundary, not deep in the UI as `[object Object]` or `NaN`.
