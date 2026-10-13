import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";

describe("GET /api/v1/health", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with status ok without any identity header", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health");

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ status: "ok" });
  });
});
