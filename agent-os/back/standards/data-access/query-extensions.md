---
name: query-extensions
description: Complex or multi-repository Include/filter chains live as static IQueryable<T> extensions in DAL/Queries; simple one-off filters stay inline in the repository
metadata:
  type: project
---

# Reusable Query Extensions

Complex or reused `Include`/filter chains live as static `IQueryable<T>` extension methods in `MySepteo.Api.DAL/Queries/`. Simple, single-use filters stay inline in the repository.

```csharp
// DAL/Queries/AccountQueries.cs — centralizes the "lien principal" rule so repos don't repeat it
public static IQueryable<Account> IncludeMainNaturalPersonElement(this IQueryable<Account> query)
    => query
        .Include(a => a.Elements.Where(e => e is PhysicalElement))
        .ThenInclude(e => ((PhysicalElement)e).NaturalPerson)
            .ThenInclude(np => np!.Address)
                .ThenInclude(ad => ad!.City);

// Repository
var account = await DbContext.Accounts
    .Where(a => a.Id == id)
    .IncludeMainNaturalPersonElement()
    .AsNoTracking()
    .FirstOrDefaultAsync();
```

- Put a chain in `DAL/Queries` when it is **complex**, **reused across repositories**, or encodes a **domain rule** (e.g. the principal-element filter).
- Keep **simple, single-use** `Where`/`OrderBy` inline in the repository ([[service-repository-responsibilities]]).
- `Include…` extensions load a graph; `Select…` extensions project to SQL-translated shapes.

See [[ef-query-patterns]], [[mapper-preloaded-navigations]], [[repository-returns-dto]].
