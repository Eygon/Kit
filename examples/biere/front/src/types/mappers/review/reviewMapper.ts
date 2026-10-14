import type { ReviewDto } from "@/types/dtos/review/reviewDto";
import { DEFAULT_AVATAR, isAvatar } from "@/types/enums/user/avatarEnum";
import type { Review } from "@/types/models/review/review";

export const reviewDtoToModel = (dto: ReviewDto): Review => ({
  id: dto.id,
  beerId: dto.beerId,
  authorId: dto.authorId,
  authorName: dto.authorName,
  authorAvatar: isAvatar(dto.authorAvatar) ? dto.authorAvatar : DEFAULT_AVATAR,
  rating: dto.rating,
  text: dto.text ?? "",
  sweetness: dto.sweetness ?? null,
  acidity: dto.acidity ?? null,
  body: dto.body ?? null,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  isMine: dto.isMine,
});
