import { useTranslation } from "react-i18next";
import type { BeerLevelsProps } from "@/pages/beerDetail/types/beerLevels";
import {
  BITTERNESS_LEVEL_LABEL_KEYS,
  COLOR_LEVEL_LABEL_KEYS,
  COLOR_LEVEL_SWATCH_CLASSES,
} from "@/pages/beerDetail/utils/beerLevelConstants";

const SWATCH_BASE_CLASSES = "size-6 shrink-0 rounded-full border-mousse";

export const BeerLevels = ({ bitternessLevel, colorLevel, styleColorRange }: BeerLevelsProps) => {
  const { t, i18n } = useTranslation();

  const getColorLabel = (level: number) => t(COLOR_LEVEL_LABEL_KEYS[level - 1]);

  const renderSwatch = (level: number) => (
    <span key={level} aria-hidden="true" className={`${SWATCH_BASE_CLASSES} ${COLOR_LEVEL_SWATCH_CLASSES[level - 1]}`} />
  );

  const renderColor = () => {
    if (colorLevel !== null) {
      return (
        <>
          {renderSwatch(colorLevel)}
          <span>{getColorLabel(colorLevel)}</span>
        </>
      );
    }
    if (styleColorRange === null) return <span>{t("pages.beerDetail.levels.notAvailable")}</span>;

    const { min, max } = styleColorRange;
    if (min === max) {
      return (
        <>
          {renderSwatch(min)}
          <span>{t("pages.beerDetail.levels.styleSingle", { label: getColorLabel(min) })}</span>
        </>
      );
    }
    return (
      <>
        {renderSwatch(min)}
        {renderSwatch(max)}
        <span>
          {t("pages.beerDetail.levels.styleRange", {
            min: getColorLabel(min),
            max: getColorLabel(max).toLocaleLowerCase(i18n.language),
          })}
        </span>
      </>
    );
  };

  return (
    <dl className="flex flex-col gap-3 rounded-mousse border-mousse bg-surface p-4 shadow-mousse">
      <div className="flex min-w-0 flex-col">
        <dt className="text-sm text-muted">{t("pages.beerDetail.levels.bitterness")}</dt>
        <dd className="break-words">
          {bitternessLevel === null
            ? t("pages.beerDetail.levels.notAvailable")
            : t("pages.beerDetail.levels.bitternessValue", {
                label: t(BITTERNESS_LEVEL_LABEL_KEYS[bitternessLevel - 1]),
                score: t("pages.beerDetail.levels.score", { level: bitternessLevel }),
              })}
        </dd>
      </div>
      <div className="flex min-w-0 flex-col">
        <dt className="text-sm text-muted">{t("pages.beerDetail.levels.color")}</dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-2 break-words">{renderColor()}</dd>
      </div>
    </dl>
  );
};
