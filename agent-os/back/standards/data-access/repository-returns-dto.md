---
name: repository-returns-dto
description: Repositories project/map reads to DTOs (or scalars), not entities; returning a tracked entity is reserved for multi-step transactional writes the service owns
metadata:
  type: project
---

# Repositories Return DTOs

A repository read returns a **DTO** (or scalar), never a tracked entity — either project with `.Select(...)` or map at the boundary with a static mapper. The projection mechanics (`.AsNoTracking()` + `.Select(...)`) live in [[ef-query-patterns]]; this standard is about the *return type*.

```csharp
public Task<List<TicketPriorityDto>> GetAll()
    => DbContext.TicketPriorities
        .AsNoTracking()
        .Select(x => new TicketPriorityDto { Id = x.Id, Label = x.Label ?? "" })
        .ToListAsync();

public async Task<TicketDto?> Get(int id)
    => (await Get(DbContext.Tickets, id))?.ToTicketDto();   // map at the boundary
```

- The generic `IRepository<TEntity, TResult>` is entity-in / DTO-out.
- **Exception — transactional writes**: a repo may return a *tracked* entity for a multi-step write. The service owns the transaction (`BeginTransactionAsync`); a companion `void Apply…`/`Update` mutates the tracked entity **without** `SaveChanges`; a save call persists.

```csharp
var ticket = await repo.GetAsync(id);        // tracked
repo.ApplyClose(ticket, update);             // mutate, no SaveChanges
// service commits the transaction it owns
```

See [[ef-query-patterns]], [[manual-mappers]], [[service-repository-responsibilities]], [[get-by-key]].
