import type { ReviewPageDto } from "@/types/dtos/review/reviewPageDto";
import { reviewDtoToModel } from "@/types/mappers/review/reviewMapper";
import type { ReviewPage } from "@/types/models/review/reviewPage";

export const reviewPageDtoToModel = (dto: ReviewPageDto): ReviewPage => ({
  mine: dto.mine ? reviewDtoToModel(dto.mine) : null,
  items: dto.items.map(reviewDtoToModel),
  total: dto.total,
  page: dto.page,
  size: dto.size,
});
