export interface ReviewRecordDto {
  readonly id: number;
  readonly userId: number;
  readonly beerId: number;
  readonly rating: number;
  readonly text: string;
  readonly sweetness: number | null;
  readonly acidity: number | null;
  readonly body: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
