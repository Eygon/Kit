import { describe, expect, it } from "vitest";
import { API_PREFIX, CORS_ALLOWED_HEADERS, CORS_ALLOWED_METHODS } from "@/app.constants";

describe("app constants", () => {
  it("versions every route under api/v1", () => {
    expect(API_PREFIX).toBe("api/v1");
  });

  it("allows the X-User-Id identity header through CORS", () => {
    expect(CORS_ALLOWED_HEADERS).toContain("X-User-Id");
    expect(CORS_ALLOWED_HEADERS).toContain("Content-Type");
  });

  it("allows every verb the API uses", () => {
    expect(CORS_ALLOWED_METHODS).toEqual(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
  });
});
