---
name: tenant-connection-strings
description: Per-tenant connection strings are composed from a Pattern template + Databases list in ConfigConnectionStrings.Get(company), not stored per company
metadata:
  type: project
---

# Tenant Connection Strings

Per-company connection strings are **composed from a template**, not stored one-per-company.

```csharp
// ConfigConnectionStrings
public string? Pattern { get; set; }                  // "Server={Server};Database={DbName};User={DbLogin};Password={DbPassword}"
public List<ConfigDatabase>? Databases { get; set; }  // company → DbName

public string? Get(string company)
    => Databases?.Find(d => d.Company == company) is { } db
        ? Pattern?.Replace("{DbName}", db.DbName).Replace("{Server}", Server)
                  .Replace("{DbLogin}", DbLogin).Replace("{DbPassword}", DbPassword)
        : null;
```

- One `Pattern` + shared `Server`/`DbLogin`/`DbPassword`; each `Databases` entry supplies only its company's `DbName`.
- `Get(company)` returns `null` for an unknown company → the tenant middleware maps that to 400 ([[tenant-resolution]]).
- Credentials in the pattern come from env ([[secrets]]).

See [[tenant-resolution]], [[secrets]].
