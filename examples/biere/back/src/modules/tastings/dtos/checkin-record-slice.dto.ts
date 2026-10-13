import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";

export interface CheckinRecordSliceDto {
  readonly items: readonly CheckinRecordDto[];
  readonly total: number;
}
