---
name: scoped-request-state
description: ICurrentCompanyAccessor / ICurrentDbContextFactory are Scoped per-request — written by middleware, read by repositories; never Singleton (would leak a tenant's DB across requests)
metadata:
  type: project
---

# Scoped Per-Request State

Per-request tenant state holders are registered **Scoped** — written by middleware early in the request, read by repositories later.

```csharp
builder.Services.AddScoped<ICurrentCompanyAccessor, CurrentCompanyAccessor>();
// CurrentDbContextFactory: auto-registered Scoped via the *Factory suffix convention
```

- `ICurrentCompanyAccessor` (current company) and `ICurrentDbContextFactory` (connection string) are mutable per-request holders.
- **Never Singleton** — a singleton holder leaks one request's tenant/connection into another's (cross-tenant data exposure).
- Middleware sets them ([[tenant-resolution]]); repositories consume them ([[multi-tenant-db-context]]).
- Inject them into a middleware's `Invoke(...)`, never its constructor ([[middleware-authoring]]).

See [[tenant-resolution]], [[multi-tenant-db-context]], [[di-auto-registration]].
