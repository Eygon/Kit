---
name: transactions
description: A write that touches several rows/tables atomically is ONE repository method running this.<repo>.manager.transaction(async (manager) => …) and using only that manager inside; services never see EntityManager / DataSource; checks (404/403/409) happen in the service before the call
metadata:
  type: project
---

# Transactions

```ts
async deleteWithTastings(id: number): Promise<void> {
  await this.beers.manager.transaction(async (manager) => {
    await manager.delete(Tasting, { beerId: id });
    await manager.delete(Beer, { id });
  });
}
```

```ts
async deleteBeer(userId: number, id: number): Promise<void> {
  await this.getOwnedBeer(userId, id);
  await this.beersRepository.deleteWithTastings(id);
}
```

- The transaction boundary is a **repository method** named after the business operation
  (`deleteWithTastings`, `transferOwnership`) — the .NET `BeginTransactionAsync` owned by
  the service has no equivalent here because services never touch TypeORM
  ([[service-repository-responsibilities]]).
- Inside the callback use **only** the `manager` argument (`manager.delete`,
  `manager.save`, `manager.getRepository(X)`); a call through `this.beers` would run
  outside the transaction.
- A thrown error inside the callback rolls everything back; let it propagate — the
  service/filter decides the status.
- Business checks (existence, ownership, uniqueness) run in the service **before** the
  transactional call. A uniqueness race is still caught by the `unique` column.
- Side effects that are not database writes (notifications…) run after the method returns
  ([[post-commit-side-effects]]).
- A single `save` / `update` / `delete` is already atomic — no transaction wrapper.
