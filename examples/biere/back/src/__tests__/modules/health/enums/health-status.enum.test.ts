import { describe, expect, it } from "vitest";
import { HealthStatusEnum } from "@/modules/health/enums/health-status.enum";

describe("HealthStatusEnum", () => {
  it("exposes the ok contract value", () => {
    expect(HealthStatusEnum.OK).toBe("ok");
  });
});
