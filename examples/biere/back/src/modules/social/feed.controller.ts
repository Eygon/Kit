import { Controller, Get, HttpCode, HttpStatus, Query } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import type { FeedPageDto } from "@/modules/social/dtos/feed-page.dto";
import { FeedQueryDto } from "@/modules/social/dtos/feed-query.dto";
import { SocialService } from "@/modules/social/social.service";

@Controller("me/feed")
export class FeedController {
  constructor(private readonly socialService: SocialService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  get(@CurrentUserId() userId: number, @Query() query: FeedQueryDto): Promise<FeedPageDto> {
    return this.socialService.getFeed(userId, query);
  }
}
