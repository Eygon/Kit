---
name: read-write-dto
description: A read/write resource has decoupled DTOs — an optional-field read DTO, a required-but-nullable create DTO (SaveXDto), and an optional-field patch DTO (UpdateXDto); write DTOs drop read-only fields
metadata:
  type: project
---

# Read DTO vs Write DTO

A resource that is both read and written has **two DTOs**, kept decoupled so a change to one never ripples to the other:

- **Read DTO** `XDto` — fields optional (`?`); carries display/computed/timestamp fields
- **Create DTO** `SaveXDto` — full create payload; fields **required** (no `?`) but `| null`; drops read-only fields
- **Patch DTO** `UpdateXDto` — partial update payload; fields **optional** (`?`); drops read-only fields

```ts
// read — all optional, includes computed/display fields
export interface FavoriteReasonDto {
  id: number;
  name: string;
  assigneeId?: number | null;
  assigneeName?: string | null;        // display
  isActive?: boolean;                  // derived state
  nameTranslationCode?: string | null; // i18n
  creationDate: string;                // timestamp
}

// write — required but nullable, drops read-only fields
export interface SaveFavoriteReasonDto {
  id: number;
  name: string;
  assigneeId: number | null;
  // no assigneeName / isActive / nameTranslationCode / creationDate
}
```

- Write DTOs **drop** read-only fields: display names (`*Name`), translation codes (`*TranslationCode`), timestamps (`creationDate`), derived flags
- `SaveXDto` — **required + `| null`** forces an explicit value on create; `null` means *clear*, never omit
- `UpdateXDto` — fields optional; built with `buildXDto`, which **omits** absent keys (PATCH leaves them unchanged) — see `typing/partial-update-builder`
- Mapper names follow `typing/mapper-naming`: `XDtoToModel` (read), `XToSaveDto` (create), `buildXDto` (patch)
- **Exception:** read-only resources (referentials, grids, indicators) have no write DTO
