---
name: dbcontext-conventions
description: One DbContext per business domain inheriting BaseDbContext<TContext>; DbSets as expression-bodied => Set<T>(); base does UseSqlServer + DEBUG-only diagnostics
metadata:
  type: project
---

# DbContext Conventions

One `DbContext` per business domain, inheriting `BaseDbContext<TContext>`.

```csharp
public class TicketContext : BaseDbContext<TicketContext>
{
    public TicketContext(DbContextOptions<TicketContext> options) : base(options) { }

    public DbSet<Ticket> Tickets => Set<Ticket>();          // expression-bodied Set<T>()
    public DbSet<TicketDetails> TicketDetails => Set<TicketDetails>();
}
```

- Inherit `BaseDbContext<TContext>` — it calls `UseSqlServer()` and enables `EnableDetailedErrors` / `EnableSensitiveDataLogging` **only in DEBUG**.
- Expose every DbSet as an expression-bodied `=> Set<T>()` property — never `{ get; set; }`.
- One context per domain (`TicketContext`, `AccountContext`, …); use the one that owns the tables you need.
- Never instantiate a context directly — tenant routing lives in the repository base ([[multi-tenant-db-context]]).

See [[layer-base-classes]], [[multi-tenant-db-context]].
