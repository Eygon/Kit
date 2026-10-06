---
name: service-repository-responsibilities
description: Business logic lives in the Service; the Repository only reads/writes data — the one exception is building an IQueryable for EF Core
metadata:
  type: project
---

# Service vs Repository Responsibilities

Business logic lives in the **Service**. The **Repository** only fetches or persists data. (Source of truth — PR review.)

- The repository must **not** orchestrate, enrich, apply business rules, or combine several data sources in memory. It returns raw data; the service composes and decides.
- **The one legitimate piece of logic in a repository is building an `IQueryable`** so EF Core can translate it to SQL (`Where`/`OrderBy`/`Select`/conditional filters before materializing). That belongs in the repository.

```csharp
// Repository — query building is OK; in-memory enrichment is NOT
public Task<List<FooDto>> Search(string? term)
{
    var query = DbContext.Foos.Where(x => x.IsActive);
    if (!string.IsNullOrWhiteSpace(term))                 // building the IQueryable — OK here
        query = query.Where(x => x.Label.Contains(term));
    return query.Select(x => new FooDto { Id = x.Id, Label = x.Label }).AsNoTracking().ToListAsync();
}

public Task<Dictionary<int, string>> GetNamesByIds(IReadOnlyCollection<int> ids)
    => DbContext.Users.Where(u => ids.Contains(u.Id)).AsNoTracking().ToDictionaryAsync(u => u.Id, u => u.Name);

// Service — owns the orchestration / enrichment / business rules
public async Task<List<FooDto>> GetEnriched(string? term)
{
    var items = await Repository.Search(term);
    var ids = items.Where(x => x.OwnerId.HasValue).Select(x => x.OwnerId!.Value).Distinct().ToList();
    var names = await Repository.GetNamesByIds(ids);
    foreach (var item in items)                            // assembling result — service's job
        if (item.OwnerId is int id && names.TryGetValue(id, out var name))
            item.OwnerName = name;
    return items;
}
```

Smell: a repository method that calls a private `Enrich...` helper, loops to set properties, or fans out to several queries and stitches the results is logic that belongs in the service.
