import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import type { StatsDto } from "@/modules/profile/dtos/stats.dto";
import { ProfileService } from "@/modules/profile/profile.service";

@Controller("me/stats")
export class StatsController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  get(@CurrentUserId() userId: number): Promise<StatsDto> {
    return this.profileService.getStats(userId);
  }
}
