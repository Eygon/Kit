export interface UpsertReviewDto {
  rating: number;
  text: string;
  sweetness: number | null;
  acidity: number | null;
  body: number | null;
}
