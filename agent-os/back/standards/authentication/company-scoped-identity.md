---
name: company-scoped-identity
description: The userIds claim is a userId:COMPANY map resolving per-company identity via JwtHelper; claim keys are Constants.Jwt consts. The MySepteo-issued token carrying it is legacy.
metadata:
  type: project
---

# Company-Scoped Identity

A single authenticated principal maps to a per-company user id via the custom **`userIds`** claim.

```csharp
// userIds claim value: "123:GROUPE_SEPTEO;456:AZKO"
int? userId = JwtHelper.ReadUserId(token, company);          // null if the company is absent
IReadOnlyDictionary<string,int> map = JwtHelper.ParseUserIds(claimValue);
```

- Format: `;`-separated `userId:COMPANY` entries; companies are upper-cased, parsed case-insensitively.
- Resolve the current company's user id with `JwtHelper.ReadUserId(token, company)` ([[current-user-resolution]]).
- Claim keys are constants in `Constants.Jwt` (`upn`, `userIds`) — never string literals.
- ⚠️ Legacy: the `userIds` claim is carried by self-issued **MySepteo** HMAC tokens (`JwtHelper.RegenerateToken`); this path is legacy ([[jwt-validation]]).

See [[current-user-resolution]], [[company-access]], [[jwt-validation]].
