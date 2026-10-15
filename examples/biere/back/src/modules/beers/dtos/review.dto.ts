import type { AvatarEnum } from "@/modules/users/enums/avatar.enum";

export interface ReviewDto {
  readonly id: number;
  readonly beerId: number;
  readonly authorId: number;
  readonly authorName: string;
  readonly authorAvatarColor: string;
  readonly authorAvatar: AvatarEnum;
  readonly rating: number;
  readonly text: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isMine: boolean;
}
