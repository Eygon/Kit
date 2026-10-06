---
name: tph-discriminators
description: Entity hierarchies use Table-Per-Hierarchy via HasDiscriminator; discriminator values are named constants in DAL/Discriminators/, never magic literals
metadata:
  type: project
---

# TPH Inheritance & Discriminators

Entity inheritance maps to **Table-Per-Hierarchy**. Configure the discriminator with named constants from `DAL/Discriminators/` — never magic literals.

```csharp
// DAL/Discriminators/BibleDiscriminator.cs
internal static class BibleDiscriminator
{
    internal const int TicketId = BibleReferences.TicketReportId;
}

// Entity Configure (preferred) — see ef-entity-type-configuration
builder.HasDiscriminator(x => x.BibleId)
    .HasValue<TicketReport>(BibleDiscriminator.TicketId)
    .IsComplete(false);   // the table holds rows this model doesn't map
```

- Discriminator values are `internal const` in `DAL/Discriminators/`, sourced from `Constants` references.
- Use `IsComplete(false)` when the table holds rows outside the mapped hierarchy.
- The C# hierarchy (e.g. `TicketReport : Document`) matches the mapper fill chain ([[mapper-base-fill]]).

See [[ef-entity-type-configuration]].
