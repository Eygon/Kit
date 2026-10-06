---
name: policy-evaluation
description: Every policy + a global fallback passes for an authenticated user (Scope claim), the MySepteo gateway (aud), or a trusted application (client-id allow-list); app tokens also need the role
metadata:
  type: project
---

# Policy Evaluation Model

Every policy — plus a global **fallback policy** requiring auth on all endpoints — is satisfied when the caller is one of:

```csharp
policy.RequireAuthenticatedUser().RequireAssertion(ctx =>
       IsAuthorizedUser(ctx)          // user token: has the Scope claim
    || ctx.User.IsInRole(role)        // application token: holds the specific role
    || IsMySepteoGateway(ctx)         // aud == configured gateway audience
    || IsTrustedApplication(ctx));    // azp/appid/client_id in the trusted allow-list
```

- **A user token (`Scope` claim) passes every policy** — role checks gate only application tokens.
- The **gateway** (matching `aud`) and **trusted applications** bypass role checks.
- The **fallback policy** means no endpoint is anonymous by default; opt out explicitly with `[AllowAnonymous]`.
- ⚠️ Deviation: the trusted client-ids are a hardcoded GUID array in `AuthorizationExtensions`; move them to configuration ([[no-hardcoded-values]]).

See [[authorization-policies]], [[company-access]].
