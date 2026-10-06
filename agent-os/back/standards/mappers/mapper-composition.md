---
name: mapper-composition
description: Map nested objects via null-conditional child mappers (child?.ToChildDto()); map collections via spread [.. seq.Select(x => x.ToDto())]. Never re-inline a child's mapping.
metadata:
  type: project
---

# Mapper Composition

A mapper delegates nested and collection mapping to other mappers — never re-inline a child's field mapping.

```csharp
// Nested — null-conditional, so a null navigation yields a null nested DTO
Priority = ticket.Priority?.ToTicketPriorityDto(),
Sales    = account.Commercial?.ToUserDto(),

// Collection — spread + Select
TimeSlots = [.. account.LinkedAccountTimeSlots.Select(x => x.ToTimeSlotDto())],
```

- Nested object → `source.Child?.ToChildDto()`.
- Collection → `[.. source.Items.Select(x => x.ToItemDto())]`.
- A child's mapping lives in its own mapper; changing it touches one place.

See [[manual-mappers]], [[mapper-preloaded-navigations]].
