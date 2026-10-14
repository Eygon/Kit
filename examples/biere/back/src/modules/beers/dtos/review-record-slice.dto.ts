import type { ReviewRecordDto } from "@/modules/beers/dtos/review-record.dto";

export interface ReviewRecordSliceDto {
  readonly items: readonly ReviewRecordDto[];
  readonly total: number;
}
