import type { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";

export type AvailabilityBadgeProps = Readonly<{
  status: AvailabilityStatusEnum;
}>;
