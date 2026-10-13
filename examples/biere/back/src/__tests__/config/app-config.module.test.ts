import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@/config/app-config";
import { APP_CONFIG } from "@/config/app-config.constants";
import { AppConfigModule } from "@/config/app-config.module";

describe("AppConfigModule", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("provides the configuration read from process.env", async () => {
    vi.stubEnv("PORT", "5999");
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule] }).compile();

    expect(moduleRef.get<AppConfig>(APP_CONFIG).port).toBe(5999);
  });
});
