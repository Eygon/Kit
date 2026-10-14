import { Transform } from "class-transformer";
import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import { USER_DISPLAY_NAME_EDIT_MAX_LENGTH, USER_DISPLAY_NAME_MIN_LENGTH } from "@/modules/users/users.constants";

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

export class UpdateProfileDto {
  @Transform(trimString)
  @IsString()
  @MinLength(USER_DISPLAY_NAME_MIN_LENGTH)
  @MaxLength(USER_DISPLAY_NAME_EDIT_MAX_LENGTH)
  readonly displayName!: string;

  @IsEnum(AvatarEnum)
  readonly avatar!: AvatarEnum;
}
