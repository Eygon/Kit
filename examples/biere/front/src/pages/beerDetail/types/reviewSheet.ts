import type { Beer } from "@/types/models/beer/beer";
import type { Review } from "@/types/models/review/review";

export type ReviewSheetProps = Readonly<{
  beer: Beer;
  mine: Review | null;
  isDisabled: boolean;
}>;
