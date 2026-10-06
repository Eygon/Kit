---
name: layer-base-classes
description: Service<TRepo> and Repository<TContext> are mandatory base classes — never hand-roll DI plumbing
metadata:
  type: project
---

# Layer Base Classes

All services and repositories MUST inherit the project base classes. Never use `ControllerBase`, raw `DbContext`, or hand-roll DI plumbing.

```csharp
// Service (sealed by default — see sealed-by-default)
public sealed class FooService : Service<IFooRepository>, IFooService
{
    public FooService(IFooRepository repo, ILogger<FooService> logger) : base(repo, logger) { }
}

// Repository
public sealed class FooRepository : Repository<FazContext>, IFooRepository
{
    public FooRepository(FazContext ctx, ILogger<FooRepository> logger, ICurrentDbContextFactory factory)
        : base(ctx, logger, factory) { }
}
```

What the base classes provide:
- `Service<TRepo>` — `protected Repository` + `protected Logger` + `DbUpdateExceptionToUserFriendlyError()`
- `Repository<TContext>` — `protected DbContext` + `protected Logger` + `BeginTransactionAsync()` + **sets `ConnectionString` from `ICurrentDbContextFactory` (multi-tenant)**

Skipping the base classes loses multi-tenant routing, structured logging setup, and DB error handling.

Concrete services/repositories are `sealed`; `Service<TRepo>` / `Repository<TContext>` are the only unsealed (base) types here ([[sealed-by-default]]).
