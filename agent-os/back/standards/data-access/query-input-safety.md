---
name: query-input-safety
description: Client-controlled ordering must go through a static whitelist map (string never reaches SQL); contains-search must escape LIKE wildcards
metadata:
  type: project
---

# Query Input Safety

Client input never shapes raw SQL. **Mandatory.**

**Sorting** — map a client sort key to a strongly-typed selector via a static whitelist; an unknown key falls back to a default.

```csharp
private static readonly Dictionary<string, Expression<Func<Account, object?>>> SortMap =
    new(StringComparer.OrdinalIgnoreCase)
    {
        ["accountId"] = x => x.Id,
        ["accountName"] = x => x.Nom,
    };

var key = SortMap.TryGetValue(filter.SortBy ?? "", out var sel) ? sel : SortMap["accountName"];
var ordered = descending ? query.OrderByDescending(key) : query.OrderBy(key);
return ordered.ThenBy(x => x.Id);   // stable secondary sort
```

**Contains-search** — escape `LIKE` wildcards so user input matches verbatim.

```csharp
var escaped = term.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");
query = query.Where(x => EF.Functions.Like(
    EF.Functions.Collate(x.Nom, "Latin1_General_CI_AI"), $"%{escaped}%"));
```

- The client `SortBy` string only selects a key — it never reaches SQL.
- Escape `[`, `%`, `_` on any user-supplied `LIKE` pattern.
- Use `EF.Functions.Collate(...)` for case/accent-insensitive matching.

See [[ef-query-patterns]].
