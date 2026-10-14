import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import {
  DEFAULT_USER_AVATAR,
  USER_AVATAR_COLOR_LENGTH,
  USER_DISPLAY_NAME_MAX_LENGTH,
} from "@/modules/users/users.constants";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "varchar", length: USER_DISPLAY_NAME_MAX_LENGTH })
  displayName!: string;

  @Column({ type: "varchar", length: USER_AVATAR_COLOR_LENGTH })
  avatarColor!: string;

  @Column({ type: "simple-enum", enum: AvatarEnum, default: DEFAULT_USER_AVATAR })
  avatar!: AvatarEnum;
}
