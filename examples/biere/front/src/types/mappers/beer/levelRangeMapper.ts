import type { LevelRangeDto } from "@/types/dtos/beer/levelRangeDto";
import type { LevelRange } from "@/types/models/beer/levelRange";

export const levelRangeDtoToModel = (dto: LevelRangeDto): LevelRange => ({
  min: dto.min,
  max: dto.max,
});
