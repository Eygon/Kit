import type { CheckinDto } from "@/types/dtos/checkin/checkinDto";

export interface CheckinPageDto {
  items: CheckinDto[];
  total: number;
  page: number;
  size: number;
}
