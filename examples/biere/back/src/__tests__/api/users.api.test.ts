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

  it("GET /api/v1/users returns the three seeded profile summaries ordered by display name, without the avatar color", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/users").set(USER_ID_HEADER_NAME, "1");

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual([
      { id: 1, displayName: "Alice", avatar: "hop", level: 1, title: "curious", discoveredCount: 0, isFollowed: false, isMe: true },
      { id: 2, displayName: "Bob", avatar: "malt", level: 1, title: "curious", discoveredCount: 0, isFollowed: false, isMe: false },
      { id: 3, displayName: "Carol", avatar: "glass", level: 1, title: "curious", discoveredCount: 0, isFollowed: false, isMe: false },
    ]);
  });

  it("GET /api/v1/users/me returns the user identified by the header", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ id: BOB_USER_ID, displayName: "Bob", avatarColor: "#10B981", avatar: "malt" });
  });

  it("GET /api/v1/users/me returns 401 with the canonical message for a well-formed but unknown user id", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/users/me").set(USER_ID_HEADER_NAME, "99");

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });
});
