import { NestFactory } from "@nestjs/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API_PREFIX } from "@/app.constants";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { APP_CONFIG } from "@/config/app-config.constants";
import { TEST_CONFIG } from "@/__tests__/support/test-config";

describe("bootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the application, configures it and listens on the configured port", async () => {
    const app = {
      get: vi.fn().mockReturnValue(TEST_CONFIG),
      setGlobalPrefix: vi.fn(),
      enableCors: vi.fn(),
      listen: vi.fn().mockResolvedValue(undefined),
    };
    const create = vi.spyOn(NestFactory, "create").mockResolvedValue(app as never);

    await bootstrap();

    expect(create).toHaveBeenCalledWith(AppModule);
    expect(app.get).toHaveBeenCalledWith(APP_CONFIG);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith(API_PREFIX);
    expect(app.listen).toHaveBeenCalledWith(TEST_CONFIG.port);
  });
});
