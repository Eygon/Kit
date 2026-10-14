import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import type { BadgeDto } from "@/modules/profile/dtos/badge.dto";
import { ProfileService } from "@/modules/profile/profile.service";

@Controller("me/badges")
export class BadgesController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@CurrentUserId() userId: number): Promise<BadgeDto[]> {
    return this.profileService.getBadges(userId);
  }
}
