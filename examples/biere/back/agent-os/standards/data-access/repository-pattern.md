---
name: repository-pattern
description: A repository is an @Injectable <Name>Repository wrapping @InjectRepository(Entity) Repository<Entity>; reads return DTOs (via the mapper), null when missing, or scalars — never entities; writes take plain entity data built by the mapper and return the DTO
metadata:
  type: project
---

# Repository Pattern

```ts
@Injectable()
export class BeersRepository {
  constructor(@InjectRepository(Beer) private readonly beers: Repository<Beer>) {}

  async findAll(sort: BeerSortEnum): Promise<BeerDto[]> {
    const entities = await this.beers.find({ order: SORT_ORDERS[sort] });
    return entities.map(toBeerDto);
  }

  async findById(id: number): Promise<BeerDto | null> {
    const entity = await this.beers.findOneBy({ id });
    return entity === null ? null : toBeerDto(entity);
  }

  existsByName(name: string): Promise<boolean> {
    return this.beers.existsBy({ name });
  }

  async create(beer: Omit<Beer, "id">): Promise<BeerDto> {
    const saved = await this.beers.save(this.beers.create(beer));
    return toBeerDto(saved);
  }

  async update(id: number, changes: Partial<Omit<Beer, "id" | "ownerId">>): Promise<BeerDto> {
    await this.beers.update({ id }, changes);
    return toBeerDto(await this.beers.findOneByOrFail({ id }));
  }
}
```

- One repository per module, named after it (`BeersRepository`), listed in the module
  `providers`, **not exported** ([[dependency-injection]]).
- It may inject several `Repository<Entity>` of **its own module's** entities. Another
  module's data is reached through that module's service ([[service-composition]]).
- Reads return **DTOs** (mapped at the boundary with the module mapper), `null` for "not
  found", `boolean` / `number` for checks. Returning an entity is not allowed — callers
  would start mutating it.
- Lookup by id: `findOneBy({ id })` → `null`; the service turns `null` into 404. Use
  `findOneByOrFail` only right after a write that guarantees the row.
- Every list has a deterministic `order` (with `id` as tie-breaker).
- Simple queries use find options inline; a query with a `LIKE`, a join or an aggregate
  uses `createQueryBuilder` with **named parameters** — never string concatenation
  ([[query-input-safety]]).
- Writes receive the entity data already built by the mapper (`toNewBeer`, `toBeerChanges`)
  ([[manual-mappers]]); a multi-step write is one transactional method ([[transactions]]).
- Repositories are tested against in-memory SQLite ([[testing-conventions]]).
