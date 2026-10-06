---
name: mapper-preloaded-navigations
description: Mappers read only navigations the repository already Include'd; they never lazy-load. Document the required Include where non-obvious.
metadata:
  type: project
---

# Mappers Rely on Pre-Loaded Navigations

A mapper reads what the repository query loaded — it never triggers a lazy-load. A navigation that wasn't `Include`d maps to `null`/`0`, silently.

```csharp
/// <remarks>
/// NaturalPerson is populated only if the account's Elements were loaded
/// (see AccountQueries.IncludeMainNaturalPersonElement).
/// </remarks>
public static AccountDto ToAccountDto(this Account account) => new()
{
    NaturalPerson = account.NaturalPerson?.ToNaturalPersonDto(),
};
```

- The repository query owns the `Include`s; the mapper only projects them.
- When a mapped field depends on a navigation, note the required `Include`/query in `<remarks>` (recommended, especially when non-obvious).
- Never load a navigation inside a mapper — that hides an N+1 in the mapping layer.

See [[manual-mappers]], [[ef-query-patterns]], [[mapper-composition]].
