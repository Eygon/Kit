import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";

describe("X-User-Id identity guard", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(["/api/v1/users", "/api/v1/users/me"])("returns 401 on %s when the header is missing", async (path) => {
    const response = await request(app.getHttpServer()).get(path);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it.each(["abc", "0", "-1", "1.5", "2abc", ""])("returns 401 when the header is %j", async (value) => {
    const response = await request(app.getHttpServer()).get("/api/v1/users").set(USER_ID_HEADER_NAME, value);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("accepts a positive integer header", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/users").set(USER_ID_HEADER_NAME, "3");

    expect(response.status).toBe(HttpStatus.OK);
  });
});
