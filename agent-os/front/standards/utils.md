---
name: utils
description: Shared helpers in src/utils/ — one topic folder, one function per file named after its export; storage only via KeyValueStorage; all error display via DisplayError
metadata:
  type: project
---

# Utils

Shared, framework-agnostic helpers live in `src/utils/`, organized by topic.

## Organization

- One folder per topic: `params/`, `text/`, `time/`, `storage/`, `error/`…
- One file per function, **named after its export**: `parseNumericParam.ts` → `parseNumericParam`.
- Helpers are pure functions, exported as typed `const` (or `function`). No catch-all/grab-bag files.

## Storage

- Access storage only through the `KeyValueStorage` interface + its implementations (`localKeyValueStorage`).
- Raw `localStorage` / `sessionStorage` calls exist **only inside `utils/storage/` implementations** — feature code depends on the interface, no exceptions.

## Error display

- All displayed errors go through `DisplayError` (`utils/error`): it parses `AxiosError`, resolves the backend `translationCode`, and shows a `septeoToast`. No ad-hoc error toasts.
- `DisplayError` is PascalCase against the camelCase rule — to be renamed `displayError` eventually.

## Domain-derived utils

- `mappers/`, `queryFunctions/`, `queryKeys/` mirror `api/` with one file per domain entity. See `typing/model-dto-mapper` and `react/tanstack-query`.
