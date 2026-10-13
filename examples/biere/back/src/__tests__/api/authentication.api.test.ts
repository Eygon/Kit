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

  it.each(["/api/v1/users", "/api/v1/users/me", "/api/v1/beers", "/api/v1/beers/1", "/api/v1/beer-styles"])(
    "returns 401 on %s when the header is a well-formed id matching no user",
    async (path) => {
      const response = await request(app.getHttpServer()).get(path).set(USER_ID_HEADER_NAME, "99");

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    },
  );

  it.each([
    ["GET", "/api/v1/me/dex", undefined],
    ["GET", "/api/v1/me/wishlist", undefined],
    ["POST", "/api/v1/me/wishlist", { beerId: 999_999 }],
    ["DELETE", "/api/v1/me/wishlist/999999", undefined],
    ["GET", "/api/v1/checkins", undefined],
    ["GET", "/api/v1/checkins/999999", undefined],
    ["DELETE", "/api/v1/checkins/999999", undefined],
    ["POST", "/api/v1/checkins", { beerId: "999999", place: "" }],
  ] as const)(
    "returns 401 and not the error of the resource on %s %s for a well-formed id matching no user",
    async (method, path, body) => {
      const verbs = { GET: "get", POST: "post", DELETE: "delete" } as const;
      const test = request(app.getHttpServer())[verbs[method]](path).set(USER_ID_HEADER_NAME, "99");
      const response = await (body === undefined ? test : test.send(body));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    },
  );

  it("returns 401 and not 400 for an unknown user on a request that is also invalid", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/beers?size=0").set(USER_ID_HEADER_NAME, "99");

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("returns 400 for the same invalid request when the user is known", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/beers?size=0").set(USER_ID_HEADER_NAME, "3");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("keeps the health route public for an unknown user id", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health").set(USER_ID_HEADER_NAME, "99");

    expect(response.status).toBe(HttpStatus.OK);
  });
});
