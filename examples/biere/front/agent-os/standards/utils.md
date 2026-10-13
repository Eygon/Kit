---
name: utils
description: Shared helpers in src/utils/ — one topic folder, one function per file named after its export; storage only via KeyValueStorage; all error display via DisplayError (HeroUI toast.danger)
metadata:
  type: project
---

# Utils

Shared, framework-agnostic helpers live in `src/utils/`, organized by topic.

## Organization

- One folder per topic: `storage/`, `currentUser/`, `displayError/`, `apiURL/`, `queryKeys/`, `queryFunctions/`…
- One file per function, **named after its export**: `getCurrentUserId.ts` → `getCurrentUserId`.
- Helpers are pure functions, exported as typed `const`. No catch-all/grab-bag files
  (`helpers.ts`, `utils.ts`).
- A helper consumed by one component or one page lives at that scope instead
  (`components/elements/tabBarItem/utils/getTabBarItemClasses.ts`) — see `file-placement`.

## Storage

- Storage is reached only through the `KeyValueStorage` interface
  (`src/types/storage/keyValueStorage.ts`) and its implementation
  `localKeyValueStorage` (`src/utils/storage/localKeyValueStorage.ts`).
- Keys are members of `StorageKeyEnum` (`src/types/enums/storage/storageKeyEnum.ts`,
  values namespaced `mousse.*`) — the interface only accepts them.
- Raw `localStorage` / `sessionStorage` calls exist **only inside `utils/storage/`**. The
  implementation swallows a blocked storage (private mode) and reads `null`.
- A helper that persists takes the storage as a defaulted last parameter, so tests pass an
  in-memory one (`src/__tests__/utils/memoryKeyValueStorage.ts`):

```ts
export const setCurrentUserId = (userId: DemoUserIdEnum, storage: KeyValueStorage = localKeyValueStorage): void => {
  storage.set(StorageKeyEnum.CURRENT_USER_ID, userId.toString());
};
```

HeroUI's `useTheme()` would persist its own `heroui-theme` key; the app does not call it
(light theme only, see `ui/design-system`).

## Current user

The demo identity (users 1 to 3) is read with `getCurrentUserId()` and written with
`setCurrentUserId()` (`utils/currentUser/`). `httpClient` reads it for the `X-User-Id`
header on every request; components go through the profile's `useCurrentUser` hook.

## Error display

- All displayed errors go through `DisplayError(error)` (`utils/displayError/displayError.ts`):
  it resolves an i18n key from the `HttpError` status with `getErrorTranslationKey` and shows
  **one** `toast.danger(...)` from `@heroui/react`. No ad-hoc error toasts — see `api/error-handling`.
- A caller with its own wording passes a resolver: `DisplayError(error, getImportErrorTranslationKey)`.
- `DisplayError` is PascalCase against the camelCase rule — kept for parity with the other
  Kit repositories; do not copy the casing for new helpers.

## Domain-derived utils

- `apiURL/`, `queryFunctions/`, `queryKeys/` mirror `api/` with one file per domain. See
  `api/url-builders`, `api/service-structure` and `react/tanstack-query`.
