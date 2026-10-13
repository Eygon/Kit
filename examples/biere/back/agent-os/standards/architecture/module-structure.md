---
name: module-structure
description: One Nest module per feature under src/modules/<name>/ with controller / service / repository / module files plus dtos/, entities/, mappers/, enums/ — the NestJS mirror of the Api / Business / DAL layers; no base classes, no I-interfaces
metadata:
  type: project
---

# Module Structure (layers)

The .NET solution splits Api / Business / DAL / Tests into projects. Here the same layers
live **inside each feature module**, one file per layer:

```
src/
  modules/
    users/
      users.controller.ts      # Api      — HTTP only (route, DTO, status code)
      users.service.ts         # Business — rules, 404/403/409, orchestration
      users.repository.ts      # DAL      — the only file touching TypeORM
      users.module.ts          # wiring   — imports, controllers, providers, exports
      users.constants.ts       # limits and values of the feature
      dtos/user.dto.ts         # read DTO (interface) / write DTOs (classes)
      entities/user.entity.ts  # TypeORM entity
      mappers/user.mapper.ts   # entity <-> DTO pure functions
      enums/                   # feature enums (e.g. health/enums/health-status.enum.ts)
  common/                      # cross-cutting: exceptions/, filters/, pipes/, security/, uploads/
  config/                      # AppConfig, APP_CONFIG token, AppConfigModule
  database/                    # DatabaseModule, database-options, DataSeeder, seed constants
  __tests__/                   # mirror of src/ (+ api/ and support/)
```

- File names are kebab-case with the Nest role suffix: `<name>.controller.ts`,
  `<name>.service.ts`, `<name>.repository.ts`, `<name>.module.ts`, `<name>.entity.ts`,
  `<name>.dto.ts`, `<name>.mapper.ts`, `<name>.enum.ts`, `<name>.constants.ts`,
  `<name>.guard.ts`, `<name>.decorator.ts`, `<name>.filter.ts`.
- The folder name is the plural feature (`users`, `beers`), the class prefix follows it
  (`UsersController`, `UsersService`, `UsersRepository`, `UsersModule`); the entity is
  singular (`User`).
- A sub-folder exists only when it holds a file ([[no-dead-files]]): `health` has no
  repository, no entity and no mapper because it has no data.
- Layer direction is one-way: controller → service → repository → entity. A controller
  never imports a repository or an entity; a service never imports TypeORM
  ([[service-repository-responsibilities]]).
- No `Service<TRepo>` / `Repository<TContext>` base classes and no `IUsersService`
  interfaces: Nest injects concrete classes and tests replace them with
  `{ provide: X, useValue: mock }` ([[dependency-injection]], [[testing-conventions]]).
- Every new module is added to `AppModule.imports` (`src/app.module.ts`).
