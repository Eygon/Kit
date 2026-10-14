import type { UpdateProfileDto } from "@/modules/users/dtos/update-profile.dto";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import type { User } from "@/modules/users/entities/user.entity";

export const toUserDto = (entity: User): UserDto => ({
  id: entity.id,
  displayName: entity.displayName,
  avatarColor: entity.avatarColor,
  avatar: entity.avatar,
});

export const toProfileChanges = (dto: UpdateProfileDto): Pick<User, "displayName" | "avatar"> => ({
  displayName: dto.displayName.trim(),
  avatar: dto.avatar,
});
