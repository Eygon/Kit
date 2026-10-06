---
name: model-dto-mapper
description: Triad of model/dto/mapper files required for every API-bound data type, one exported type per file
metadata:
  type: project
---

# Model / DTO / Mapper Triad

Every data type requires exactly three files in their respective directories:

- `src/types/models/<domain>/<Name>.ts` — frontend model
- `src/types/dtos/<domain>/<Name>Dto.ts` — API contract (what the API sends/receives)
- `src/types/mappers/<domain>/<Name>Mapper.ts` — conversion functions between the two

Mappers live under `types/`, not `utils/` — they are part of the type/contract layer. (Legacy
mappers may still sit in `src/utils/mappers/`; new and touched ones go under `src/types/mappers/`.)

**Rule:** No exceptions. Even when DTO and model shapes are similar, the triad is always created.

**Why:** Isolates API contract changes from frontend logic; enforces team-wide consistency.

## One type per file

Each file under `models/`, `dtos/` and `mappers/` exports **one** type, named after
the file. A nested shape is its own file, not a second `export interface` in the
parent.

```ts
// ❌ commercialConsoleOfferPageDto.ts holding two contracts
export interface OfferTotalsDto { ... }
export interface CommercialConsoleOfferPageDto { totals: OfferTotalsDto; ... }

// ✅ offerTotalsDto.ts
export interface OfferTotalsDto { ... }

// ✅ commercialConsoleOfferPageDto.ts
import type { OfferTotalsDto } from "@prjTypes/dtos/commercialConsole/offerTotalsDto";
export interface CommercialConsoleOfferPageDto { totals: OfferTotalsDto; ... }
```

**Why:** the nested shape is what other screens reuse — a totals bar, a reference
item, a scope sub-group. Buried in its parent it is invisible to the next reader,
and the import that finds it drags in the whole page contract.

A union of contract values does not belong in a DTO file either: it is an enum,
placed per `enums`.

```
src/types/models/offerType/offerType.ts
src/types/dtos/offerType/offerTypeDto.ts
src/types/mappers/offerType/offerTypeMapper.ts
```
