---
name: get-by-key
description: Use the base Repository Get<T>(DbSet, id) helper for a by-PK load (FindAsync); it rejects Id==0. Data reads use AsNoTracking + .Select projection instead.
metadata:
  type: project
---

# Get By Key

For a simple by-primary-key fetch, use the base `Get<T>(DbSet, id)` helper, then map.

```csharp
public async Task<TicketDto?> Get(int id)
    => (await Get(DbContext.Tickets, id))?.ToTicketDto();
```

- `Get<T>` wraps `FindAsync` and throws `ArgumentException` on `Id == 0` (logging the caller).
- It returns a **tracked** entity — use it when you need the full entity to map or mutate.
- For reads that just return data, prefer an `AsNoTracking()` + `.Select(...)` projection instead ([[ef-query-patterns]]).

See [[layer-base-classes]], [[ef-query-patterns]], [[repository-returns-dto]].
