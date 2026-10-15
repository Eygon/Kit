export interface ReviewDto {
  id: number;
  beerId: number;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  rating: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
}
