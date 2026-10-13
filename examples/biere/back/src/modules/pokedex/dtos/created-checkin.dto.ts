import type { CheckinDto } from "@/modules/pokedex/dtos/checkin.dto";

export interface CreatedCheckinDto {
  readonly checkin: CheckinDto;
  readonly isFirstDiscovery: boolean;
}
