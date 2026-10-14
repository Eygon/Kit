import type { NewReview } from "@/types/models/review/newReview";
import type { Review } from "@/types/models/review/review";

export type ReviewFormProps = Readonly<{
  initialReview: Review | null;
  isSaving: boolean;
  onSubmit: (review: NewReview) => Promise<void>;
}>;
