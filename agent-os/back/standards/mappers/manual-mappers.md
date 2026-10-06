---
name: manual-mappers
description: Entity↔DTO mapping via manual static extension methods — never AutoMapper or Mapster
metadata:
  type: project
---

# Manual Static Mappers

All entity↔DTO mapping uses manual static extension methods. Never use AutoMapper or Mapster.

```csharp
// In MySepteo.Api.Mappers/FooMapper.cs
public static class FooMapper
{
    public static FooDto ToFooDto(this Foo entity) => new()
    {
        Id = entity.Id,
        Name = entity.Name ?? string.Empty,
    };
}

// Usage
var dto = entity.ToFooDto();
```

- Method name convention: `To[DtoName]()` as extension method on the entity
- One mapper class per domain entity, placed in `MySepteo.Api.Mappers/`
- Static class, no constructor, no state
