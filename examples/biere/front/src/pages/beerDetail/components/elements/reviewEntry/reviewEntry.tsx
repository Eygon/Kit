import { Avatar, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { StarRating } from "@/pages/beerDetail/components/elements/starRating/starRating";
import type { ReviewEntryProps } from "@/pages/beerDetail/types/reviewEntry";
import {
  REVIEW_CRITERIA,
  REVIEW_CRITERION_LABEL_KEYS,
  REVIEW_CRITERION_LEVEL_LABEL_KEYS,
} from "@/types/enums/review/reviewCriterionEnum";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";
import { formatRating } from "@/utils/beer/formatRating";

export const ReviewEntry = ({ review }: ReviewEntryProps) => {
  const { t, i18n } = useTranslation();
  const filledCriteria = REVIEW_CRITERIA.flatMap((criterion) => {
    const level = review[criterion];
    return level === null ? [] : [{ criterion, level }];
  });

  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-mousse border-mousse bg-surface p-3 shadow-mousse">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar color="accent" size="sm" className="shrink-0">
          <Avatar.Fallback>{review.authorName.trim().charAt(0).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <span className="min-w-0 break-words">{review.authorName}</span>
        {review.isMine && (
          <Chip color="accent" variant="primary" className="shrink-0">
            {t("pages.beerDetail.reviews.list.mine")}
          </Chip>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StarRating
          value={review.rating}
          label={t("pages.beerDetail.reviews.ratingLabel", { rating: formatRating(review.rating, i18n.language) })}
        />
        <span className="text-sm text-muted">{formatCheckinDate(review.updatedAt, i18n.language)}</span>
      </div>
      {review.text !== "" && <p className="whitespace-pre-line break-words">{review.text}</p>}
      {filledCriteria.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {filledCriteria.map(({ criterion, level }) => (
            <li key={criterion}>
              {t("pages.beerDetail.reviews.list.criterion", {
                name: t(REVIEW_CRITERION_LABEL_KEYS[criterion]),
                level: t(REVIEW_CRITERION_LEVEL_LABEL_KEYS[criterion][level - 1]),
              })}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};
