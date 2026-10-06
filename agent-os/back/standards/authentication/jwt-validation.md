---
name: jwt-validation
description: Accept Azure AD v1 + v2 issuers and the custom MySepteo HMAC issuer (legacy); signing keys = Azure OIDC + optional JwtSecret; audiences = API + Gateway
metadata:
  type: project
---

# JWT Validation

JWT Bearer (Microsoft.Identity.Web) is configured to accept tokens from multiple issuers.

```csharp
ValidIssuers =
[
    $"https://sts.windows.net/{tenantId}/",                   // Azure AD v1
    $"https://login.microsoftonline.com/{tenantId}/v2.0",     // Azure AD v2
    Jwt.MySepteo                                              // self-issued (legacy)
];
IssuerSigningKeys = [ ..azureOidcSigningKeys /* + new SymmetricSecurityKey(JwtSecret) */ ];
ValidAudiences = [ AzureAudienceApi, AzureAudienceGateway ];
```

- Both Azure AD **v1 and v2** token formats are accepted.
- Signing keys come from the Azure OIDC metadata endpoint, refreshed on key rollover (`RefreshOnIssuerKeyNotFound = true`).
- `ValidateIssuer` / `ValidateAudience` / `ValidateLifetime` / `ValidateIssuerSigningKey` are all on.
- ⚠️ Legacy: the custom **`MySepteo`** issuer + symmetric `JwtSecret` (HMAC) path is legacy ([[company-scoped-identity]]); new work targets Azure AD tokens.

See [[company-scoped-identity]].
