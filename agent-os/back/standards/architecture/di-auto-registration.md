---
name: di-auto-registration
description: Four naming suffixes auto-registered as Scoped — no explicit AddScoped needed
metadata:
  type: project
---

# DI Auto-Registration

Four naming suffixes are auto-registered as Scoped in `Program.cs` — no explicit `AddScoped<>` needed:

| Suffix | Assembly | Base class excluded |
|--------|----------|---------------------|
| `*Service` | `MySepteo.Api.Services` | `Service<>` |
| `*Repository` | `MySepteo.Api.Repositories` | `Repository<>` |
| `*Factory` | `MySepteo.Api.Repositories` | — |
| `*Context` | `MySepteo.Api.DAL` | `BaseDbContext<>` |

- Any class not matching these suffixes is NOT auto-registered — add it manually in `Program.cs`
- Registering a class manually AND following the convention = double registration bug
