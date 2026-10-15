import type { Correction } from "@/types/models/correction/correction";

export interface CorrectionBoard {
  open: Correction[];
  recentlyClosed: Correction[];
  pendingCount: number;
}
