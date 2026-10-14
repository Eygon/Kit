import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { ReviewDto } from "@/types/dtos/review/reviewDto";
import type { ReviewPageDto } from "@/types/dtos/review/reviewPageDto";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { newReviewToDto } from "@/types/mappers/review/newReviewMapper";
import { reviewDtoToModel } from "@/types/mappers/review/reviewMapper";
import { reviewPageDtoToModel } from "@/types/mappers/review/reviewPageMapper";
import type { NewReview } from "@/types/models/review/newReview";
import type { Review } from "@/types/models/review/review";
import type { ReviewPage } from "@/types/models/review/reviewPage";
import { BEER_MY_REVIEW, BEER_REVIEWS } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";
import { getErrorTranslationKey } from "@/utils/displayError/getErrorTranslationKey";

const getSaveReviewErrorTranslationKey = (error: unknown): string =>
  error instanceof HttpError && error.status === HttpStatusCodeEnum.FORBIDDEN
    ? "pages.beerDetail.reviews.checkinRequired"
    : getErrorTranslationKey(error);

export default class ReviewService {
  static async getPage(beerId: number, page: number): Promise<ReviewPage> {
    const response = await httpClient.get<ReviewPageDto>(`${BEER_REVIEWS(beerId)}?page=${page}`);
    if (response.data === null) throw new HttpError(response.status, "Empty review page");
    return reviewPageDtoToModel(response.data);
  }

  static async save(beerId: number, newReview: NewReview): Promise<Review> {
    try {
      const response = await httpClient.put<ReviewDto>(BEER_MY_REVIEW(beerId), newReviewToDto(newReview));
      if (response.data === null) throw new Error("Empty save response");
      return reviewDtoToModel(response.data);
    } catch (error) {
      DisplayError(error, getSaveReviewErrorTranslationKey);
      throw error;
    }
  }

  static async remove(beerId: number): Promise<void> {
    try {
      await httpClient.delete(BEER_MY_REVIEW(beerId));
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }
}
