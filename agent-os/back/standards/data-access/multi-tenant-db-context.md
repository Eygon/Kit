---
name: multi-tenant-db-context
description: Never instantiate DbContext directly — tenant routing happens via ICurrentDbContextFactory in Repository base class
metadata:
  type: project
---

# Multi-Tenant DbContext

`CurrentDbContextMiddleware` sets `ICurrentDbContextFactory.ConnectionString` per request. `Repository<TContext>` reads it in its constructor and calls `DbContext.Database.SetConnectionString()`.

**Never instantiate a DbContext directly** — doing so bypasses tenant routing and hits the default/empty connection string.

```csharp
// WRONG
var ctx = new UserContext(options); // wrong tenant or no connection

// RIGHT
// Inject UserContext via DI — Repository base class handles the rest
public FooRepository(UserContext ctx, ILogger<FooRepository> logger, ICurrentDbContextFactory factory)
    : base(ctx, logger, factory) { }
```

- `ICurrentDbContextFactory` is injected into every Repository constructor via the base class
- Each `*Context` maps to a business domain (e.g. `UserContext`, `TicketContext`) — use the one that owns the tables you need
