import type { CorrectionDto } from "@/types/dtos/correction/correctionDto";

export interface CorrectionBoardDto {
  open: CorrectionDto[];
  recentlyClosed: CorrectionDto[];
  pendingCount: number;
}
