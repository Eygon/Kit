---
name: constants
description: SCREAMING_SNAKE_CASE with unit suffixes (_MS/_PX), as const/readonly literals, xxxConstants.ts files, and named backend/legacy IDs with required JSDoc trace
metadata:
  type: project
---

# Constants

## Files & location

- A constants file is `xxxConstants.ts` (concatenated): `timeConstants.ts`,
  `windowConstants.ts`, `gridConstants.ts` — or plain `constants.ts` inside a
  dedicated `constants/` / `utils/` folder.
- Placement follows `file-placement`: shared → `src/utils/<topic>/`,
  feature-local → that feature's `utils/`.
- Existing dot-form files (`createTicketPanel.constants.ts`) are legacy — rename
  to the concatenated form when you next touch them.

## Naming & units

- Every constant export is `SCREAMING_SNAKE_CASE`.
- Carry the unit in the name: durations end in `_MS`, pixel values in `_PX`.

```ts
export const HISTORY_TRANSITION_MS = 450;
export const ACCOUNT_SIDEBAR_STICKY_OFFSET_PX = 16;
```

## `as const` & readonly

- Object/tuple literals, and string literals that feed a type, use `as const`.
- Shared arrays are typed `readonly T[]`.

```ts
export const EMPTY_DROPDOWN_OPTION = { value: 0, label: "" } as const;
export const FOLDER_FLAGS = [ ... ] as const;
export const HOSPITALITY_COMPANY_LABELS: readonly string[] = ["SEQUOIASOFT"];
```

## Backend & legacy magic IDs

- Never inline a backend ID at a call site. Extract it to a `SCREAMING_SNAKE_CASE`
  constant naming what the ID *means* (`ACCOUNT_TYPE_ID_PRIVILEGE`, not `7`).
- A JSDoc tracing the legacy source is **required** whenever one exists, and is the
  **only** sanctioned exception to the no-comments rule. It states the ID's meaning
  and the reference (table / `Global.XXX = value`).

```ts
/** ID identifying the "Privilège" account type. Legacy reference: Global.ID_DEFAUT_CLIENT_PRIVILEGE = 7. */
export const ACCOUNT_TYPE_ID_PRIVILEGE = 7;

/** Primary key (T_Param.IdParam) of the "Suspendu Litige Comptable" account state. Legacy reference: Global.ID_DOSSIER_SUSPENDU_LITIGE_COMPTABLE = 202. */
export const ACCOUNT_STATE_ID_SUSPENDU_LITIGE_COMPTABLE = 202;
```

- A *bounded* set of related backend IDs is a numeric enum instead — see `enums`.
