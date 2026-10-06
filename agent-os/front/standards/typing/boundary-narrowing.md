---
name: boundary-narrowing
description: Untrusted input enters as unknown then is narrowed via isX/parseX guards or zod safeParse; never any
metadata:
  type: project
---

# Boundary Input: unknown then narrow

Untrusted input enters the app typed `unknown`, never `any`. Narrow before use.

**Sources that are `unknown`:** `JSON.parse` result, `postMessage` payload, storage values, any value whose shape isn't guaranteed.

```ts
const parsed = JSON.parse(raw) as unknown;
if (!isValidPopoutSnapshot(parsed)) return null;
```

## Narrowing: zod if a schema exists, else hand-rolled guards

- A zod schema already exists (form, model) → `safeParse`, return `null`/default on `!success`.
- Ad hoc payload (storage, postMessage) → compose small guards.

```ts
const parsePayload = (payload: unknown): FormValues | null => {
  const result = persistedSchema.safeParse(payload);
  return result.success ? { ...defaultValues, ...result.data } : null;
};
```

## Guard ladder

- Leaf guards use `typeof` / `Array.isArray`.
- Object guards go through `isRecord` first, then check keys.
- `parseX(value: unknown): X | null` returns `null` on failure (`[]` for arrays).

```ts
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStoredLock = (value: unknown): value is StoredLock => {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.masterId);
};
```

`Record<string, unknown>` is the canonical "arbitrary object" shape — cast to it (after a `typeof === "object"` check) to read keys without `any`.

## API responses: direct DTO cast is allowed

`response.data` is cast straight to its DTO — the backend contract is trusted via the model/dto/mapper layer. Keep `unknown` only on a genuinely at-risk field, then check it.

```ts
const raw = response.data as { items?: unknown; totalCount?: number };
if (!Array.isArray(raw.items)) return { items: [], totalCount: 0 };

const generated: unknown = response.data;
if (typeof generated !== "number") throw new TypeError("...");
```

**Why:** A shape drift on an untrusted source surfaces at the boundary, not deep in the UI as `[object Object]`.
