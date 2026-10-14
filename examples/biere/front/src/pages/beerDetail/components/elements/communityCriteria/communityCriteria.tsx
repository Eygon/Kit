import { Label, Meter } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { CommunityCriteriaProps } from "@/pages/beerDetail/types/communityCriteria";
import {
  REVIEW_CRITERION_LABEL_KEYS,
  REVIEW_CRITERION_LEVEL_LABEL_KEYS,
  REVIEW_CRITERION_MIN_COUNT,
} from "@/types/enums/review/reviewCriterionEnum";
import { formatRating } from "@/utils/beer/formatRating";

const MIN_LEVEL = 1;
const MAX_LEVEL = 5;

export const CommunityCriteria = ({ criteria }: CommunityCriteriaProps) => {
  const { t, i18n } = useTranslation();

  if (criteria.length === 0) return null;

  return (
    <ul aria-label={t("pages.beerDetail.reviews.criteria.label")} className="flex flex-col gap-3">
      {criteria.map(({ criterion, average, count }) => {
        const name = t(REVIEW_CRITERION_LABEL_KEYS[criterion]);

        if (average === null) {
          return (
            <li key={criterion} className="break-words text-muted">
              {t("pages.beerDetail.reviews.criteria.hidden", { name, count: REVIEW_CRITERION_MIN_COUNT - count })}
            </li>
          );
        }

        const level = Math.min(Math.max(Math.floor(average), MIN_LEVEL), MAX_LEVEL);
        const text = t("pages.beerDetail.reviews.criteria.value", {
          name,
          average: formatRating(average, i18n.language),
          level: t(REVIEW_CRITERION_LEVEL_LABEL_KEYS[criterion][level - 1]),
        });

        return (
          <li key={criterion}>
            <Meter color="accent" value={average} minValue={0} maxValue={MAX_LEVEL} className="w-full">
              <Label className="break-words">{text}</Label>
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
          </li>
        );
      })}
    </ul>
  );
};
