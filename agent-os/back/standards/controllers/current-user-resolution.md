---
name: current-user-resolution
description: Resolve the caller from the JWT via base helpers; return the canonical 401 message when unidentified
metadata:
  type: project
---

# Current-User Resolution

Read the caller from the JWT via the base-class helpers, never from the request body or query.

```csharp
int? userId = await ReadCompanyUserIdAsync();
if (userId is null or <= 0)
    return Unauthorized("Unable to identify the currently signed-in user.");
```

- `ReadCompanyUserIdAsync()` → company-scoped user id; `ReadTokenAsync(Jwt.Upn)` → e-mail / UPN.
- When unidentified, return `Unauthorized("Unable to identify the currently signed-in user.")` — this exact message, for consistency across endpoints.
