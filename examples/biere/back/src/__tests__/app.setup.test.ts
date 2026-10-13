import type { INestApplication } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { API_PREFIX, CORS_ALLOWED_HEADERS, CORS_ALLOWED_METHODS } from "@/app.constants";
import { configureApp } from "@/app.setup";
import { TEST_CONFIG } from "@/__tests__/support/test-config";

describe("configureApp", () => {
  it("sets the global prefix and the CORS policy from the configuration", () => {
    const app = { setGlobalPrefix: vi.fn(), enableCors: vi.fn() };

    const result = configureApp(app as unknown as INestApplication, TEST_CONFIG);

    expect(result).toBe(app);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith(API_PREFIX);
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ["http://localhost:5173", "http://localhost:5174"],
      allowedHeaders: [...CORS_ALLOWED_HEADERS],
      methods: [...CORS_ALLOWED_METHODS],
    });
  });
});
