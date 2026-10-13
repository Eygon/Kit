import type { CheckinDto } from "@/modules/pokedex/dtos/checkin.dto";

export interface CheckinPageDto {
  readonly items: readonly CheckinDto[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
}
