import type { CreateCorrectionDto } from "@/types/dtos/correction/createCorrectionDto";
import type { NewCorrection } from "@/types/models/correction/newCorrection";

export const newCorrectionToDto = (newCorrection: NewCorrection): CreateCorrectionDto => ({
  characteristic: newCorrection.characteristic,
  value: newCorrection.value,
  reason: newCorrection.reason,
});
