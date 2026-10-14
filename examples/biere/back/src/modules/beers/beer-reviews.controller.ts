import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Put, Query } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { BeersService } from "@/modules/beers/beers.service";
import type { ReviewDto } from "@/modules/beers/dtos/review.dto";
import type { ReviewPageDto } from "@/modules/beers/dtos/review-page.dto";
import { ReviewsQueryDto } from "@/modules/beers/dtos/reviews-query.dto";
import { UpsertReviewDto } from "@/modules/beers/dtos/upsert-review.dto";

@Controller("beers/:beerId/reviews")
export class BeerReviewsController {
  constructor(private readonly beersService: BeersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getPage(
    @CurrentUserId() userId: number,
    @Param("beerId", ParseIntPipe) beerId: number,
    @Query() query: ReviewsQueryDto,
  ): Promise<ReviewPageDto> {
    return this.beersService.getReviewPage(userId, beerId, query);
  }

  @Put("me")
  @HttpCode(HttpStatus.OK)
  saveMine(
    @CurrentUserId() userId: number,
    @Param("beerId", ParseIntPipe) beerId: number,
    @Body() dto: UpsertReviewDto,
  ): Promise<ReviewDto> {
    return this.beersService.saveMyReview(userId, beerId, dto);
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMine(@CurrentUserId() userId: number, @Param("beerId", ParseIntPipe) beerId: number): Promise<void> {
    return this.beersService.deleteMyReview(userId, beerId);
  }
}
