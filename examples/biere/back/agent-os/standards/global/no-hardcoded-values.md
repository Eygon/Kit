---
name: no-hardcoded-values
description: Never hardcode limits/thresholds/business values or messages reused elsewhere — use a named SCREAMING_SNAKE_CASE constant in the owning *.constants.ts file, or a parameter
metadata:
  type: project
---

# No Hardcoded Values

Never write a limit, a cap, a threshold, a length, a port or any business value inline.
Use a **named constant** ([[constants]]) or a **parameter**.

```ts
// WRONG — magic numbers in the mapping and in the validation
@Column({ type: "varchar", length: 50 })
displayName!: string;

// RIGHT — src/modules/users/users.constants.ts
export const USER_DISPLAY_NAME_MAX_LENGTH = 50;

@Column({ type: "varchar", length: USER_DISPLAY_NAME_MAX_LENGTH })
displayName!: string;
```

- The same constant feeds the entity column (`length`) **and** the write DTO
  (`@MaxLength(...)`), so the database and the 400 never disagree.
- Prefer a parameter when the value legitimately varies by caller.
- Environment-dependent values (port, database path, CORS origins) are configuration, not
  constants: they go through `AppConfig` with a default constant ([[typed-config]]).
- Client-facing messages used in more than one place (`UNIDENTIFIED_USER_MESSAGE`,
  `INTERNAL_ERROR_MESSAGE`) live in `src/common/exceptions/exception-messages.constants.ts`.
  A one-off exception message stays inline in the `throw` ([[exceptions]]).
- HTTP statuses are never numbers — `HttpStatus.X` ([[http-status]]).
