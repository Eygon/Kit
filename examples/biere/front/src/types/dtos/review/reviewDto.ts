export interface ReviewDto {
  id: number;
  beerId: number;
  authorId: number;
  authorName: string;
  authorAvatarColor: string;
  rating: number;
  text: string;
  sweetness: number | null;
  acidity: number | null;
  body: number | null;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
}
