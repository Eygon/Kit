import type { HealthStatusEnum } from "@/modules/health/enums/health-status.enum";

export interface HealthDto {
  readonly status: HealthStatusEnum;
}
