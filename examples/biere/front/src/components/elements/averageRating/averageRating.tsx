import { StarFill } from "@gravity-ui/icons";
import { useTranslation } from "react-i18next";
import type { AverageRatingProps } from "@/types/components/averageRating";
import { formatRating } from "@/utils/beer/formatRating";

export const AverageRating = ({ averageRating, reviewCount }: AverageRatingProps) => {
  const { t, i18n } = useTranslation();

  if (averageRating === null) {
    return <p className="truncate text-muted">{t("beer.rating.none")}</p>;
  }

  const rating = formatRating(averageRating, i18n.language);

  return (
    <p className="flex min-w-0 items-center gap-1">
      <StarFill aria-hidden="true" className="size-4 shrink-0 text-highlight" />
      <span aria-hidden="true" className="truncate">
        {t("beer.rating.summary", { rating, count: reviewCount })}
      </span>
      <span className="sr-only">{t("beer.rating.label", { rating, count: reviewCount })}</span>
    </p>
  );
};
