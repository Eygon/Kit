---
name: constants
description: SCREAMING_SNAKE_CASE exports in <scope>.constants.ts files at the narrowest scope, unit suffixes (_MS, _BYTES, _PERCENT, _MAX_LENGTH), readonly T[] / as const / Readonly<Record>, Symbol injection tokens, and a required JSDoc only for an external/legacy ID
metadata:
  type: project
---

# Constants

## Files & location

- A constants file is `<scope>.constants.ts`: `users.constants.ts`,
  `app-config.constants.ts`, `upload.constants.ts`, `security.constants.ts`,
  `seed.constants.ts`, `exception-messages.constants.ts`.
- Placement follows [[file-placement]]: feature constants in the module, shared ones in
  `src/common/<topic>/`, application shell in `src/app.constants.ts`.
- A constant used by one function only may stay a non-exported `const` at the top of that
  file (`POSITIVE_INTEGER_PATTERN` in `parse-user-id.ts`, `SORT_ORDERS` in a repository).

## Naming & units

- Every exported constant is `SCREAMING_SNAKE_CASE`.
- The unit is in the name: `UPLOAD_MAX_SIZE_BYTES`, `UPLOAD_MAX_SIZE_MEGABYTES`,
  `BEER_ABV_MAX_PERCENT`, `USER_DISPLAY_NAME_MAX_LENGTH`, `CACHE_TTL_MS`.
- Derive instead of repeating: `UPLOAD_MAX_SIZE_BYTES = UPLOAD_MAX_SIZE_MEGABYTES * BYTES_PER_MEGABYTE`.

```ts
export const UPLOAD_MAX_SIZE_MEGABYTES = 5;
export const UPLOAD_MAX_SIZE_BYTES = UPLOAD_MAX_SIZE_MEGABYTES * BYTES_PER_MEGABYTE;
export const DEFAULT_CORS_ORIGINS: readonly string[] = ["http://localhost:5173", "http://localhost:5174"];
export const APP_CONFIG = Symbol("APP_CONFIG");
```

## `as const` & readonly

- Object/tuple literals use `as const` (`SEED_USERS`); shared arrays are `readonly T[]`;
  lookup maps are `Readonly<Record<Enum, T>>`.
- DI tokens for non-class providers are `Symbol("NAME")` constants.

## External & legacy IDs

- Never inline an external ID at a call site; name what it means.
- A JSDoc tracing the source is **required** for such an ID and is the only sanctioned
  exception to [[no-comments]]:

```ts
/** Category id of "craft beers" in the Open Food Facts taxonomy. Source: en:craft-beers. */
export const OPEN_FOOD_FACTS_CRAFT_BEER_CATEGORY = "en:craft-beers";
```

- A bounded set of related values is an enum instead ([[enums]]).
