import type { AvatarEnum } from "@/types/enums/user/avatarEnum";

export interface Review {
  id: number;
  beerId: number;
  authorId: number;
  authorName: string;
  authorAvatar: AvatarEnum;
  rating: number;
  text: string;
  sweetness: number | null;
  acidity: number | null;
  body: number | null;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
}
