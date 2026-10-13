---
name: typed-config
description: All configuration is read once from process.env by loadAppConfig into a readonly AppConfig, provided under the APP_CONFIG Symbol by the global AppConfigModule and injected with @Inject(APP_CONFIG); optional keys fall back to *_DEFAULT constants, invalid values fail at boot
metadata:
  type: project
---

# Typed Configuration

`process.env` is read in **one place**: `src/config/app-config.ts`.

```ts
export interface AppConfig {
  readonly port: number;
  readonly databasePath: string;
  readonly corsOrigins: readonly string[];
}

export const loadAppConfig = (env: NodeJS.ProcessEnv): AppConfig => ({
  port: readPort(env.PORT),
  databasePath: readDatabasePath(env.DATABASE_PATH),
  corsOrigins: readCorsOrigins(env.CORS_ORIGINS),
});
```

| Variable | Default (`app-config.constants.ts`) | Used by |
|---|---|---|
| `PORT` | `DEFAULT_PORT = 5090` | `bootstrap` → `app.listen` |
| `DATABASE_PATH` | `DEFAULT_DATABASE_PATH = "data/mousse.db"` (`":memory:"` in tests) | `buildDatabaseOptions` |
| `CORS_ORIGINS` (comma separated) | `http://localhost:5173`, `http://localhost:5174` | `configureApp` |

- `AppConfigModule` is `@Global()` and provides `APP_CONFIG` (a `Symbol`); consume it with
  `@Inject(APP_CONFIG) private readonly config: AppConfig` or in a factory
  (`inject: [APP_CONFIG]`, see `DatabaseModule`). Never read `process.env` anywhere else.
- **Optional** key → a default constant; blank counts as absent. **Required** key (none
  today) → no default, `loadAppConfig` throws `new Error("Missing XXX")` so the app fails
  at boot, not on the first request. **Invalid** value → throw at boot
  (`Invalid PORT: abc`).
- A new key = a new `readonly` field on `AppConfig`, a `readXxx` function, a default
  constant if optional, and tests in `src/__tests__/config/app-config.test.ts`.
- Tests never touch `process.env` to configure the app: `createTestApp` overrides
  `APP_CONFIG` with `TEST_CONFIG` ([[api-tests]]); `vi.stubEnv` is only for testing
  `AppConfigModule` itself.
- No `@nestjs/config` / `.env` loader dependency: the variables come from the shell.

See [[secrets]], [[no-hardcoded-values]].
