---
name: dependency-injection
description: Providers are @Injectable classes listed explicitly in their module's providers (no auto-registration by suffix); constructor injection with private readonly; a module exports only its service; non-class values use a Symbol token + @Inject
metadata:
  type: project
---

# Dependency Injection

Nest has no suffix scan like the .NET `AddSuffixRegistrations`: **a provider exists only if
its module lists it.**

```ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

- Every service, repository, guard, filter and seeder is decorated `@Injectable()`.
- Inject through the constructor only, as `private readonly` ([[final-readonly-by-default]]).
  Never `moduleRef.get(...)` / service locator in production code.
- A module **exports only its service** — never its repository — so other modules reach
  its data through business rules ([[service-composition]]).
- Global, cross-cutting providers are registered once in `AppModule` with the Nest
  tokens `APP_GUARD`, `APP_PIPE`, `APP_FILTER` ([[cross-cutting-providers]]).
- A non-class value is provided under a `Symbol` token declared in a constants file and
  injected with `@Inject(TOKEN)`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "@/config/app-config";
import { APP_CONFIG } from "@/config/app-config.constants";

@Injectable()
export class CorsReporter {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  origins(): readonly string[] {
    return this.config.corsOrigins;
  }
}
```

- Providers are singletons (Nest default scope). Never `Scope.REQUEST`; per-request data
  rides on the request object ([[request-state]]).
- Registering a provider in two modules creates two instances — import the owning module
  instead.
