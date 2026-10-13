---
name: model-dto-mapper
description: Triad of model/dto/mapper files required for every API-bound data type, one exported type per file
metadata:
  type: project
---

# Model / DTO / Mapper Triad

Every API-bound data type requires exactly three files in their respective directories:

- `src/types/models/<domain>/<name>.ts` — frontend model
- `src/types/dtos/<domain>/<name>Dto.ts` — API contract (what the API sends/receives)
- `src/types/mappers/<domain>/<name>Mapper.ts` — conversion functions between the two

Mappers live under `types/`, not `utils/` — they are part of the type/contract layer.

**Rule:** No exceptions. Even when DTO and model shapes are identical, the triad is always created.

**Why:** Isolates API contract changes (the NestJS DTOs in the back) from frontend logic;
enforces team-wide consistency.

## One type per file

Each file under `models/`, `dtos/` and `mappers/` exports **one** type, named after
the file. A nested shape is its own file, not a second `export interface` in the
parent.

```ts
// ❌ beerDto.ts holding two contracts
export interface BreweryDto { ... }
export interface BeerDto { brewery: BreweryDto; ... }

// ✅ src/types/dtos/brewery/breweryDto.ts
export interface BreweryDto { ... }

// ✅ src/types/dtos/beer/beerDto.ts
import type { BreweryDto } from "@/types/dtos/brewery/breweryDto";
export interface BeerDto { brewery?: BreweryDto | null; ... }
```

**Why:** the nested shape is what other screens reuse — a brewery card, a style chip. Buried
in its parent it is invisible to the next reader, and the import that finds it drags in the
whole contract.

A union of contract values does not belong in a DTO file either: it is an enum,
placed per `enums`.

```
src/types/models/user/user.ts
src/types/dtos/user/userDto.ts
src/types/mappers/user/userMapper.ts
```
