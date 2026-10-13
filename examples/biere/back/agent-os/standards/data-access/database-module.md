---
name: database-module
description: One TypeORM connection, configured once in DatabaseModule (forRootAsync + buildDatabaseOptions) on better-sqlite3 — file data/mousse.db, ":memory:" in tests, autoLoadEntities, synchronize as schema management; no migrations folder, no hand-written DDL
metadata:
  type: project
---

# Database Module

```ts
export const buildDatabaseOptions = (config: AppConfig): TypeOrmModuleOptions => {
  ensureDatabaseDirectory(config.databasePath);
  return {
    type: "better-sqlite3",
    database: config.databasePath,
    autoLoadEntities: true,
    synchronize: true,
  };
};
```

- The single `TypeOrmModule.forRootAsync` lives in `src/database/database.module.ts`; no
  other module calls `forRoot`. Feature modules call `forFeature([...])`.
- Driver: **`better-sqlite3`** (synchronous native SQLite, fastest, real file). The file is
  `data/mousse.db` by default (`DATABASE_PATH`), its folder is created at boot, `data/` is
  gitignored. Tests use `":memory:"` — one fresh database per Nest application.
- **Schema = entities**: `synchronize: true` creates/updates tables at boot, the
  equivalent of the reference's `EnsureCreated`. There is no `migrations/` folder and no
  `typeorm migration:*` script. If data must survive an incompatible change, delete
  `data/mousse.db` locally and let the seeder rebuild the demo data ([[seeding]]).
- Never instantiate a `DataSource` or open a connection by hand; inject
  `@InjectRepository(Entity)` in a repository ([[repository-pattern]]).
- Tests that need a database import `inMemoryDatabase()`
  (`src/__tests__/support/test-database.ts`) or go through `createTestApp()`.
