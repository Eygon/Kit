---
name: read-write-dto
description: A read/write resource has decoupled DTOs — an optional-field read DTO, a required-but-nullable create DTO (SaveXDto), and an optional-field patch DTO (UpdateXDto); write DTOs drop read-only fields
metadata:
  type: project
---

# Read DTO vs Write DTO

A resource that is both read and written has **two or three DTOs**, kept decoupled so a
change to one never ripples to the other — mirroring the backend's read and write DTOs:

- **Read DTO** `XDto` — fields optional (`?`); carries display/computed/timestamp fields
- **Create DTO** `SaveXDto` — full create payload; fields **required** (no `?`) but `| null`; drops read-only fields
- **Patch DTO** `UpdateXDto` — partial update payload; fields **optional** (`?`); drops read-only fields

```ts
// read — all optional, includes computed/display fields
export interface TastingDto {
  id: number;
  beerId: number;
  beerName?: string | null;   // display
  rating?: number | null;
  notes?: string | null;
  averageRating?: number;     // derived
  tastedAt: string;           // timestamp
}

// write — required but nullable, drops read-only fields
export interface SaveTastingDto {
  beerId: number;
  rating: number | null;
  notes: string | null;
  // no id / beerName / averageRating / tastedAt
}
```

- Write DTOs **drop** read-only fields: ids assigned by the server, display names (`*Name`), timestamps, derived values
- `SaveXDto` — **required + `| null`** forces an explicit value on create; `null` means *clear*, never omit
- `UpdateXDto` — fields optional; built with `buildXDto`, which **omits** absent keys (PATCH leaves them unchanged) — see `typing/partial-update-builder`
- Mapper names follow `typing/mapper-naming`: `xDtoToModel` (read), `xToSaveDto` (create), `buildXDto` (patch)
- **Exception:** read-only resources (users, beer styles, health) have no write DTO
