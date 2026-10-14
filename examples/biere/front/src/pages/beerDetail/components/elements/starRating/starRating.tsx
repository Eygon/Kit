import { Star, StarFill } from "@gravity-ui/icons";
import type { StarRatingProps } from "@/pages/beerDetail/types/starRating";

const STAR_COUNT = 5;
const HALF_STEP = 0.5;
const STAR_POSITIONS = Array.from({ length: STAR_COUNT }, (_, index) => index + 1);
const STAR_ICON_CLASSES = "size-5 shrink-0";

const getStarState = (position: number, roundedValue: number) => {
  if (roundedValue >= position) return "full";
  if (roundedValue >= position - HALF_STEP) return "half";
  return "empty";
};

export const StarRating = ({ value, label }: StarRatingProps) => {
  const roundedValue = Math.round(value / HALF_STEP) * HALF_STEP;

  return (
    <span className="inline-flex items-center gap-0.5">
      {STAR_POSITIONS.map((position) => {
        const state = getStarState(position, roundedValue);

        return (
          <span key={position} data-state={state} aria-hidden="true" className="relative inline-flex">
            {state === "full" ? (
              <StarFill className={`${STAR_ICON_CLASSES} text-highlight`} />
            ) : (
              <Star className={`${STAR_ICON_CLASSES} text-foreground`} />
            )}
            {state === "half" && (
              <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                <StarFill className={`${STAR_ICON_CLASSES} text-highlight`} />
              </span>
            )}
          </span>
        );
      })}
      {label !== undefined && <span className="sr-only">{label}</span>}
    </span>
  );
};
