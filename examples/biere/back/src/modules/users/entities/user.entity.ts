import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { USER_AVATAR_COLOR_LENGTH, USER_DISPLAY_NAME_MAX_LENGTH } from "@/modules/users/users.constants";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "varchar", length: USER_DISPLAY_NAME_MAX_LENGTH })
  displayName!: string;

  @Column({ type: "varchar", length: USER_AVATAR_COLOR_LENGTH })
  avatarColor!: string;
}
