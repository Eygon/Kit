import { describe, expectTypeOf, it } from "vitest";
import type { HealthDto } from "@/modules/health/dtos/health.dto";
import type { HealthStatusEnum } from "@/modules/health/enums/health-status.enum";

describe("HealthDto", () => {
  it("carries a readonly status", () => {
    expectTypeOf<HealthDto>().toEqualTypeOf<{ readonly status: HealthStatusEnum }>();
  });
});
