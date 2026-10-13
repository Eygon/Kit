---
name: seeding
description: Demo data is inserted by the idempotent DataSeeder on application bootstrap (only when the table is empty), from SEED_* constants with fixed ids in src/database/seed.constants.ts; tests rely on those constants, not on literals
metadata:
  type: project
---

# Seeding

```ts
@Injectable()
export class DataSeeder implements OnApplicationBootstrap {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    if ((await this.users.count()) > 0) {
      return;
    }
    await this.users.insert(SEED_USERS.map((user) => ({ ...user })));
  }
}
```

- Demo data lives in `src/database/seed.constants.ts` with **fixed ids**
  (`ALICE_USER_ID = 1`, `BOB_USER_ID = 2`, `CAROL_USER_ID = 3`) so the front and the
  `X-User-Id` header can rely on them.
- Idempotent: seed a table only when it is empty; a restart on the persisted
  `data/mousse.db` changes nothing.
- `DataSeeder` is the only database code outside a feature repository; it lives in
  `src/database/` and registers the entities it seeds with `forFeature` in
  `DatabaseModule`.
- New seed data for a feature → a `SEED_<FEATURE>` constant + a block in `seed()` + a test in
  `src/__tests__/database/data-seeder.test.ts`.
- Tests reference the constants (`BOB_USER_ID`), never re-type the ids.
