export interface ReviewDto {
  readonly id: number;
  readonly beerId: number;
  readonly authorId: number;
  readonly authorName: string;
  readonly authorAvatarColor: string;
  readonly rating: number;
  readonly text: string;
  readonly sweetness: number | null;
  readonly acidity: number | null;
  readonly body: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isMine: boolean;
}
