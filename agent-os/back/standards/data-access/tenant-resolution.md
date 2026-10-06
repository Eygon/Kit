---
name: tenant-resolution
description: CurrentDbContextMiddleware maps the {company} route value (upper, default GROUPE_SEPTEO) to a connection string and sets ICurrentDbContextFactory + ICurrentCompanyAccessor; unknown company → 400
metadata:
  type: project
---

# Per-Request Tenant Resolution

`CurrentDbContextMiddleware` resolves the tenant from the `{company}` route value and primes the per-request state.

```csharp
string company = httpContext.GetRouteValue("company") is string c ? c.ToUpper() : "GROUPE_SEPTEO";
string? connectionString = connectionStrings.Value.Get(company);
if (string.IsNullOrEmpty(connectionString))      // unknown company → 400 problem+json
    return Problem400(httpContext, $"Invalid company : {company}");

currentDbContextFactory.ConnectionString = connectionString;   // repos read this
currentCompanyAccessor.Company = company;
```

- The `{company}` route value is upper-cased; absent → **`GROUPE_SEPTEO`**, the canonical default tenant (also the company authorized to any user).
- Connection string comes from `ConfigConnectionStrings.Get(company)`; unknown company → `400 application/problem+json`.
- Downstream, the repository base reads `ICurrentDbContextFactory.ConnectionString` ([[multi-tenant-db-context]]).
- Runs after authentication, before authorization ([[pipeline-ordering]]).

See [[multi-tenant-db-context]], [[scoped-request-state]], [[pipeline-ordering]].
