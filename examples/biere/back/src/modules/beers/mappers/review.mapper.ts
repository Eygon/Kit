import { normalizeLineEndings } from "@/common/text/normalize-line-endings";
import type { ReviewDto } from "@/modules/beers/dtos/review.dto";
import type { ReviewPageDto } from "@/modules/beers/dtos/review-page.dto";
import type { ReviewRecordDto } from "@/modules/beers/dtos/review-record.dto";
import type { ReviewRecordSliceDto } from "@/modules/beers/dtos/review-record-slice.dto";
import type { UpsertReviewDto } from "@/modules/beers/dtos/upsert-review.dto";
import type { Review } from "@/modules/beers/entities/review.entity";
import type { UserDto } from "@/modules/users/dtos/user.dto";

export const toReviewRecordDto = (entity: Review): ReviewRecordDto => ({
  id: entity.id,
  userId: entity.userId,
  beerId: entity.beerId,
  rating: entity.rating,
  text: entity.text,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toNewReview = (dto: UpsertReviewDto, userId: number, beerId: number, now: Date): Omit<Review, "id"> => ({
  userId,
  beerId,
  rating: dto.rating,
  text: normalizeLineEndings(dto.text ?? "").trim(),
  sweetness: null,
  acidity: null,
  body: null,
  createdAt: now,
  updatedAt: now,
});

export const toReviewDto = (record: ReviewRecordDto, author: UserDto, currentUserId: number): ReviewDto => ({
  id: record.id,
  beerId: record.beerId,
  authorId: record.userId,
  authorName: author.displayName,
  authorAvatarColor: author.avatarColor,
  authorAvatar: author.avatar,
  rating: record.rating,
  text: record.text,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  isMine: record.userId === currentUserId,
});

const toReviewDtoOfKnownAuthor = (
  record: ReviewRecordDto,
  authorsById: ReadonlyMap<number, UserDto>,
  currentUserId: number,
): ReviewDto => {
  const author = authorsById.get(record.userId);
  if (author === undefined) {
    throw new Error(`Author ${record.userId} of review ${record.id} not found.`);
  }
  return toReviewDto(record, author, currentUserId);
};

export const toReviewPageDto = (
  mine: ReviewRecordDto | null,
  slice: ReviewRecordSliceDto,
  authorsById: ReadonlyMap<number, UserDto>,
  currentUserId: number,
  page: number,
  size: number,
): ReviewPageDto => ({
  mine: mine === null ? null : toReviewDtoOfKnownAuthor(mine, authorsById, currentUserId),
  items: slice.items.map((record) => toReviewDtoOfKnownAuthor(record, authorsById, currentUserId)),
  total: slice.total,
  page,
  size,
});
