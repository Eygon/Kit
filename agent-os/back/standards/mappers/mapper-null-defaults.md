---
name: mapper-null-defaults
description: The mapper coalesces nullable entity columns into the DTO's non-null shape with explicit defaults (?? string.Empty, enum default, fallback field)
metadata:
  type: project
---

# Mapper Null → Default

The mapper is the boundary where nullable entity columns become the DTO's non-null shape. Coalesce with an explicit default.

```csharp
Label         = entity.Label ?? string.Empty,
ClosureStatus = ticket.ClosureStatus ?? TicketClosureStatus.Closed,
ScheduledDate = ticket.ScheduledDate ?? ticket.RedactionDate,   // fallback to another column
```

- A non-null DTO property mapped from a nullable column → supply a default (`?? string.Empty`, enum default, or a fallback column).
- Keep the default in the mapper, not in the service or the consumer.

See [[manual-mappers]], [[nullable-as-required]].
