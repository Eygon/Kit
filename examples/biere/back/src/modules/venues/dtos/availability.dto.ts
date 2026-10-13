import type { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";

export interface AvailabilityDto {
  readonly status: AvailabilityStatusEnum;
  readonly lastConfirmedAt: Date | null;
  readonly recentVoterCount: number;
}
