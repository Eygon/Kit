---
name: service-validation
description: The service enforces what class-validator can't — no-op PATCH (400), existence (404), access (403), uniqueness/state (409) — in exactly that order, with guard clauses that throw Nest exceptions before any write
metadata:
  type: project
---

# Service-Layer Validation

DTO decorators validate **shape** ([[dto-validation]]). The service validates **meaning**,
always in the same order:

```ts
async updateBeer(userId: number, id: number, dto: UpdateBeerDto): Promise<BeerDto> {
  if (!hasAnySuppliedValue(dto)) {
    throw new BadRequestException("At least one field must be supplied.");
  }
  const beer = await this.getOwnedBeer(userId, id);
  if (dto.name !== undefined && dto.name.trim() !== beer.name && (await this.beersRepository.existsByName(dto.name.trim()))) {
    throw new ConflictException(`A beer named "${dto.name.trim()}" already exists.`);
  }
  return this.beersRepository.update(id, toBeerChanges(dto));
}
```

1. **400** — payload rules that need no data (no-op PATCH, cross-field rules).
2. **404** — load the target and its required parents (`getBeer` → `NotFoundException`).
3. **403** — access rule on the loaded resource ([[resource-access]]).
4. **409** — conflicts with existing data (unique name, invalid state transition).
5. Write, then return the DTO.

- Guard clauses with early `throw`; no nested `if/else` pyramids, no boolean result codes.
- Reuse private helpers (`getBeer`, `getOwnedBeer`) so every method applies the same
  404/403 rules.
- Never write before all checks passed — a partial write followed by a 409 is a bug.
- Each branch has a unit test with a mocked repository asserting the exception **and**
  that no write was called ([[testing-conventions]]).

See [[exceptions]], [[http-status-codes]].
