import type { UserDto } from "@/modules/users/dtos/user.dto";
import type { User } from "@/modules/users/entities/user.entity";

export const toUserDto = (entity: User): UserDto => ({
  id: entity.id,
  displayName: entity.displayName,
  avatarColor: entity.avatarColor,
});
