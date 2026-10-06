---
name: company-access
description: AuthorizedCompanyMiddleware authorizes a user token if the company is in its userIds (GROUPE_SEPTEO always), an app token if the company is in its Company.* roles or ALL; else 403
metadata:
  type: project
---

# Company Access Authorization

After the tenant is resolved, `AuthorizedCompanyMiddleware` checks the caller may access *that* company.

```csharp
if (IsUserToken(ctx))                  // has Scope claim
    // allowed if company == GROUPE_SEPTEO, or company is a key in the userIds claim
else if (IsApplicationToken(ctx))      // has appid / client_id
    // allowed if a Company.<CODE> role matches, or a Company.ALL role
// otherwise → 403 application/problem+json
```

- **User token**: company must be a key in the `userIds` claim ([[company-scoped-identity]]); `GROUPE_SEPTEO` is always allowed.
- **Application token**: company must match a `Company.<CODE>` role or `Company.ALL`.
- Runs after tenant resolution, before the endpoint ([[pipeline-ordering]], [[tenant-resolution]]).
- Distinct from policy/role gating ([[policy-evaluation]]) — this gates the *tenant*, not the *action*.

See [[tenant-resolution]], [[company-scoped-identity]], [[policy-evaluation]].
