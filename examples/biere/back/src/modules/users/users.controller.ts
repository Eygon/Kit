import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { UsersService } from "@/modules/users/users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUserId() userId: number): Promise<UserDto> {
    return this.usersService.getUser(userId);
  }
}
