export interface ReviewRecordDto {
  readonly id: number;
  readonly userId: number;
  readonly beerId: number;
  readonly rating: number;
  readonly text: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
