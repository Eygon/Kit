import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import type { ProfileDto } from "@/modules/social/dtos/profile.dto";
import type { ProfileSummaryDto } from "@/modules/social/dtos/profile-summary.dto";
import { SocialService } from "@/modules/social/social.service";

@Controller("users")
export class ProfilesController {
  constructor(private readonly socialService: SocialService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@CurrentUserId() userId: number): Promise<ProfileSummaryDto[]> {
    return this.socialService.getProfiles(userId);
  }

  @Get(":userId/profile")
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUserId() userId: number, @Param("userId", ParseIntPipe) targetId: number): Promise<ProfileDto> {
    return this.socialService.getProfile(userId, targetId);
  }

  @Get(":userId/followers")
  @HttpCode(HttpStatus.OK)
  getFollowers(
    @CurrentUserId() userId: number,
    @Param("userId", ParseIntPipe) targetId: number,
  ): Promise<ProfileSummaryDto[]> {
    return this.socialService.getFollowers(userId, targetId);
  }

  @Get(":userId/following")
  @HttpCode(HttpStatus.OK)
  getFollowing(
    @CurrentUserId() userId: number,
    @Param("userId", ParseIntPipe) targetId: number,
  ): Promise<ProfileSummaryDto[]> {
    return this.socialService.getFollowing(userId, targetId);
  }

  @Post(":userId/follow")
  @HttpCode(HttpStatus.CREATED)
  follow(@CurrentUserId() userId: number, @Param("userId", ParseIntPipe) targetId: number): Promise<ProfileDto> {
    return this.socialService.follow(userId, targetId);
  }

  @Delete(":userId/follow")
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollow(@CurrentUserId() userId: number, @Param("userId", ParseIntPipe) targetId: number): Promise<void> {
    return this.socialService.unfollow(userId, targetId);
  }
}
