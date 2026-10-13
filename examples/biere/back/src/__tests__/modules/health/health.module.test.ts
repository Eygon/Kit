import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { HealthController } from "@/modules/health/health.controller";
import { HealthModule } from "@/modules/health/health.module";

describe("HealthModule", () => {
  it("provides the health controller", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [HealthModule] }).compile();

    expect(moduleRef.get(HealthController)).toBeInstanceOf(HealthController);
  });
});
