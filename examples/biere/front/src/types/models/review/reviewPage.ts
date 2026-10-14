import type { Review } from "@/types/models/review/review";

export interface ReviewPage {
  mine: Review | null;
  items: Review[];
  total: number;
  page: number;
  size: number;
}
