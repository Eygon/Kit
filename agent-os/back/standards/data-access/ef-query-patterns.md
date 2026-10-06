---
name: ef-query-patterns
description: Reads use AsNoTracking + .Select() projection; writes must NOT use AsNoTracking
metadata:
  type: project
---

# EF Query Patterns

**Reads**: always chain `AsNoTracking()` and project with `.Select(...)` before materializing.

```csharp
// Good — only needed columns fetched, no change tracking overhead
var result = await DbContext.Users
    .Where(x => x.IsActive)
    .AsNoTracking()
    .Select(x => new UserDto { Id = x.Id, Name = x.Name })
    .ToListAsync();
```

**Writes**: do NOT use `AsNoTracking()` — EF change tracking is required for `Add`, `Update`, `Remove`, `SaveChangesAsync`.

```csharp
// Good — tracked entity, EF detects changes
DbContext.Users.Add(entity);
await DbContext.SaveChangesAsync();
```

- **Order of `.AsNoTracking()` and `.Select(...)`**: when projecting to a DTO the order is functionally equivalent (a projection to a non-entity type is not tracked anyway). The codebase convention is `.AsNoTracking()` **then** `.Select(...)`. If a specific query shows a measurable performance difference between the two orders, pick the faster one; otherwise the order does not matter.
- Avoid loading full entities then mapping in memory — SQL should return only needed columns
