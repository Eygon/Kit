import { describe, expect, it } from "vitest";
import { IS_PUBLIC_KEY } from "@/common/security/security.constants";
import { HealthController } from "@/modules/health/health.controller";
import { HealthStatusEnum } from "@/modules/health/enums/health-status.enum";

describe("HealthController", () => {
  it("reports an ok status", () => {
    expect(new HealthController().getHealth()).toEqual({ status: HealthStatusEnum.OK });
  });

  it("is public", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController)).toBe(true);
  });
});
