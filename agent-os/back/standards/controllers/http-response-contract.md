---
name: http-response-contract
description: Every action declares its full [ProducesResponseType] set — success code plus every other status it can return
metadata:
  type: project
---

# HTTP Response Contract

Every action declares its full set of `[ProducesResponseType]` — including the success code — so the OpenAPI spec is complete.

```csharp
[HttpGet("{id:int}")]
[ProducesResponseType<FooDto>(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status204NoContent)]
public async Task<ActionResult<FooDto>> Get(...) { ... }
```

- Declare 200 (or 201) **and** every other status the action can return (204/400/401/403/404…).
- Use the generic form `[ProducesResponseType<T>(StatusCodes.Status200OK)]` for the body type.
- **204 vs 404** — an empty GET result (by-id not found, or empty collection) is **204**, *never* 404, so a plain GET declares 200 + 204 and **not** 404 ([[http-204-no-content]]). Declare **404 only** when the action can throw `ResourceNotFoundException` for a *referenced* resource (e.g. a PATCH/POST/DELETE whose target — or a required parent — is missing) ([[domain-exceptions]]).
- Required even on thin always-200 actions. *(Some early controllers — e.g. `AccountsController.Get`/`GetAll` — predate this; full coverage is the target.)*

See [[http-204-no-content]], [[domain-exceptions]], [[controller-return-type]].
