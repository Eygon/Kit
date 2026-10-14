import { Body, Controller, HttpCode, HttpStatus, Put } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import type { ProfileDto } from "@/modules/social/dtos/profile.dto";
import { SocialService } from "@/modules/social/social.service";
import { UpdateProfileDto } from "@/modules/users/dtos/update-profile.dto";

@Controller("me/profile")
export class MeProfileController {
  constructor(private readonly socialService: SocialService) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  update(@CurrentUserId() userId: number, @Body() dto: UpdateProfileDto): Promise<ProfileDto> {
    return this.socialService.updateMyProfile(userId, dto);
  }
}
