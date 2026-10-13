---
name: secrets
description: A secret is a configuration value read from an environment variable through AppConfig — never hardcoded, never committed (.env is gitignored), never logged, never returned in an error body
metadata:
  type: project
---

# Secrets

The app has no secret today. When one appears (API key, external token):

```ts
export interface AppConfig {
  readonly port: number;
  readonly databasePath: string;
  readonly corsOrigins: readonly string[];
  readonly geocodingApiKey: string;
}

const readRequired = (name: string, raw: string | undefined): string => {
  if (raw === undefined || raw.trim() === "") {
    throw new Error(`Missing ${name}`);
  }
  return raw.trim();
};
```

- It is a **required** `AppConfig` field read from the environment ([[typed-config]]) — no
  default constant, so a missing secret stops the boot.
- Never in source, never in a committed file. `.env` is in `.gitignore`; document the
  variable name (not the value) in `CLAUDE.md`.
- Never logged: `Logger` calls print ids and counts, not configuration objects.
- Never in a response: the exception filter hides unexpected errors behind
  `INTERNAL_ERROR_MESSAGE` ([[error-response]]) — keep it that way.
- Tests use a fake value in `TEST_CONFIG`, never a real one.
