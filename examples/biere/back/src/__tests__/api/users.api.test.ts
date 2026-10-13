import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { BOB_USER_ID } from "@/database/seed.constants";

describe("users API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/users returns the three seeded users ordered by display name", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/users").set(USER_ID_HEADER_NAME, "1");

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual([
      { id: 1, displayName: "Alice", avatarColor: "#F59E0B" },
      { id: 2, displayName: "Bob", avatarColor: "#10B981" },
      { id: 3, displayName: "Carol", avatarColor: "#8B5CF6" },
    ]);
  });

  it("GET /api/v1/users/me returns the user identified by the header", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ id: BOB_USER_ID, displayName: "Bob", avatarColor: "#10B981" });
  });

  it("GET /api/v1/users/me returns 401 with the canonical message for a well-formed but unknown user id", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/users/me").set(USER_ID_HEADER_NAME, "99");

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });
});
