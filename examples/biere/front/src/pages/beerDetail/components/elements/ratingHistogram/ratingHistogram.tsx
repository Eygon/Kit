import { Label, Meter } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { RatingHistogramProps } from "@/pages/beerDetail/types/ratingHistogram";

const STARS_FROM_TOP = [5, 4, 3, 2, 1];

export const RatingHistogram = ({ distribution, reviewCount }: RatingHistogramProps) => {
  const { t } = useTranslation();
  const maxValue = Math.max(reviewCount, 1);

  return (
    <div role="group" aria-label={t("pages.beerDetail.reviews.histogram.label")} className="flex flex-col gap-2">
      {STARS_FROM_TOP.map((stars) => {
        const count = distribution.find((bucket) => bucket.stars === stars)?.count ?? 0;
        const starsLabel = t("pages.beerDetail.reviews.histogram.stars", { count: stars });
        const countLabel = t("pages.beerDetail.reviews.count", { count });

        return (
          <Meter
            key={stars}
            color="warning"
            value={count}
            maxValue={maxValue}
            valueLabel={t("pages.beerDetail.reviews.histogram.bar", { stars: starsLabel, reviews: countLabel })}
            className="w-full"
          >
            <Label>{starsLabel}</Label>
            <Meter.Output>{countLabel}</Meter.Output>
            <Meter.Track>
              <Meter.Fill />
            </Meter.Track>
          </Meter>
        );
      })}
    </div>
  );
};
