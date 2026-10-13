---
name: api-tests
description: End-to-end HTTP tests use createTestApp() (AppModule + TEST_CONFIG in-memory SQLite + configureApp) and supertest against app.getHttpServer(); assert status with HttpStatus and the exact body; probe controllers declared in the test file cover cross-cutting behaviour
metadata:
  type: project
---

# API Tests

```ts
import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { BOB_USER_ID } from "@/database/seed.constants";

describe("users API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/users/me returns the user identified by the header", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ id: BOB_USER_ID, displayName: "Bob", avatarColor: "#10B981" });
  });
});
```

- `createTestApp(extraImports?)` (`src/__tests__/support/test-app.ts`) compiles the real
  `AppModule`, overrides `APP_CONFIG` with `TEST_CONFIG` (`:memory:` database), applies
  `configureApp` and `init()`s — the production pipeline, seeded, isolated per file.
- One file per resource or concern: `src/__tests__/api/<resource>.api.test.ts`
  (`health`, `users`, `authentication`, `validation`, `error-filter`).
- Each endpoint covers: success status + exact body, 401 without header, 400 on invalid
  input, and every 404 / 403 / 409 branch it has — including the **order** when several
  apply ([[http-status-codes]]).
- Cross-cutting behaviour (validation, filter, uploads) is tested with a small probe
  `@Controller` + `@Module` declared **inside the test file** and passed to
  `createTestApp([ProbeModule])` — never a test-only route in `src/`.
- Bodies are asserted with `toEqual` (exact shape), errors with `toEqual({ message })`
  ([[error-response]]).
- Tests that write data assume the order of `it` within a file, or create their own data;
  never depend on another file.
