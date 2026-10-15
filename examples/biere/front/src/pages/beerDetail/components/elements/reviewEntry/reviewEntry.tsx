import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/elements/userAvatar/userAvatar";
import { StarRating } from "@/pages/beerDetail/components/elements/starRating/starRating";
import type { ReviewEntryProps } from "@/pages/beerDetail/types/reviewEntry";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";
import { formatRating } from "@/utils/beer/formatRating";

export const ReviewEntry = ({ review }: ReviewEntryProps) => {
  const { t, i18n } = useTranslation();

  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-mousse border-mousse bg-surface p-3 shadow-mousse">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar avatar={review.authorAvatar} isDecorative />
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
          label={t("pages.beerDetail.reviews.ratingLabel", {
            rating: formatRating(review.rating, i18n.language),
          })}
        />
        <span className="text-sm text-muted">
          {formatCheckinDate(review.updatedAt, i18n.language)}
        </span>
      </div>
      {review.text !== "" && (
        <p className="whitespace-pre-line break-words">{review.text}</p>
      )}
    </li>
  );
};
