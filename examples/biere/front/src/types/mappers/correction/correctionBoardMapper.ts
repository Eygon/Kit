import type { CorrectionBoardDto } from "@/types/dtos/correction/correctionBoardDto";
import { correctionDtoToModel } from "@/types/mappers/correction/correctionMapper";
import type { Correction } from "@/types/models/correction/correction";
import type { CorrectionBoard } from "@/types/models/correction/correctionBoard";

const isCorrection = (correction: Correction | null): correction is Correction => correction !== null;

export const correctionBoardDtoToModel = (dto: CorrectionBoardDto): CorrectionBoard => ({
  open: dto.open.map(correctionDtoToModel).filter(isCorrection),
  recentlyClosed: dto.recentlyClosed.map(correctionDtoToModel).filter(isCorrection),
  pendingCount: dto.pendingCount,
});
