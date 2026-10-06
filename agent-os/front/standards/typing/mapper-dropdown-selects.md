---
name: mapper-dropdown-selects
description: Selectable models carry value/label; xToDropdownSelects helpers prepend emptyDropdownSelect and localeCompare-sort for Septeo UI dropdowns
metadata:
  type: project
---

# Dropdown / Selectable Mapper Helpers

Septeo UI `<Dropdown>`/`<Autocomplete>` expect `DropdownSelect` (`{ label, value }`).
Resolve that shape in the mapper, not in components.

**Selectable models** carry `value` / `label` set by the DTO→model mapper:

```ts
export const TicketDtoToModel = (dto: TicketDto): Ticket => ({
    id: dto.id,
    reason: dto.reason,
    value: dto.id,
    label: dto.reason ?? ""
});
```

**List → options** via an `xToDropdownSelects` helper (same file, free naming):

```ts
export const usersToDropdownSelects = (users: User[]): DropdownSelect[] => [
    emptyDropdownSelect,
    ...users.map((u) => ({ label: u.name, value: u.id })).sort((a, b) => a.label.localeCompare(b.label))
];
```

- Prefix `emptyDropdownSelect` for non-required selects.
- Sort with `localeCompare` when the API order isn't already guaranteed.
- Import `emptyDropdownSelect` from `@utils/constants/emptyDropdownSelect`.
```
