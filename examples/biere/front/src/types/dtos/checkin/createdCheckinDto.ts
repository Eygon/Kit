import type { CheckinDto } from "@/types/dtos/checkin/checkinDto";

export interface CreatedCheckinDto {
  checkin: CheckinDto;
  isFirstDiscovery: boolean;
}
