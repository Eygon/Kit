---
name: mapper-base-fill
description: For inheritance hierarchies, a base mapper fills shared fields on an already-built derived DTO (_ = derived.ToBaseDto(dto)); it returns the DTO, discarded by the caller
metadata:
  type: project
---

# Base-Type Fill Mapper

For an entity/DTO inheritance hierarchy (e.g. `Ticket : Event : Bible`), the base mapper populates the inherited fields on the **already-constructed** derived DTO.

```csharp
public static TicketDto ToTicketDto(this Ticket ticket)
{
    TicketDto dto = new() { /* ticket-specific fields */ };
    _ = ticket.ToEventDto(dto);   // base mapper fills shared fields in place
    return dto;
}
```

- The fill method takes the target DTO, sets the shared fields, and **returns the same instance** (allows chaining); callers discard it with `_ =`.
- Each level fills its own fields and delegates upward (`ToEventDto` → `ToBibleDto`).

See [[manual-mappers]].
