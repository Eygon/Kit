---
name: no-hardcoded-values
description: Never hardcode limits/thresholds/business values — use a named constant or a parameter
metadata:
  type: project
---

# No Hardcoded Values

Never hardcode a limit, cap, threshold, or any business value inline. Use a **named constant** or pass it as a **parameter**. (Source of truth — PR review.)

```csharp
// WRONG — magic number buried in the query
return await query.OrderBy(x => x.Label).Take(50).Select(...).ToListAsync();

// RIGHT — named constant
private const int MaxQualificationResults = 50;
return await query.OrderBy(x => x.Label).Take(MaxQualificationResults).Select(...).ToListAsync();

// RIGHT — caller decides
public Task<List<FooDto>> Search(string? term, int maxResults) => ...
```

- A constant documents intent and gives a single place to change the value.
- Prefer a parameter when the value legitimately varies by caller.
- This complements the project rule "pas de règles société en dur — paramétrer".
