import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { CorrectionCard } from "@/components/elements/correctionCard/correctionCard";
import { TechnicalSheetRow } from "@/pages/beerDetail/components/elements/technicalSheetRow/technicalSheetRow";
import { ProposeCorrectionSheet } from "@/pages/beerDetail/components/widgets/proposeCorrectionSheet/proposeCorrectionSheet";
import { useBeerCorrectionsQuery } from "@/pages/beerDetail/hooks/useBeerCorrectionsQuery";
import type { TechnicalSheetProps } from "@/pages/beerDetail/types/technicalSheet";
import {
  BITTERNESS_LEVEL_LABEL_KEYS,
  COLOR_LEVEL_LABEL_KEYS,
  COLOR_LEVEL_SWATCH_CLASSES,
} from "@/pages/beerDetail/utils/beerLevelConstants";
import { BEER_AROMA_LABEL_KEYS } from "@/types/enums/beer/beerAromaEnum";
import {
  BEER_CHARACTERISTICS,
  BEER_CHARACTERISTIC_LABEL_KEYS,
  BeerCharacteristicEnum,
} from "@/types/enums/beer/beerCharacteristicEnum";
import { BEER_FORMAT_LABEL_KEYS } from "@/types/enums/beer/beerFormatEnum";
import { BeerSourceEnum } from "@/types/enums/beer/beerSourceEnum";
import { formatCharacteristicValue } from "@/utils/beer/formatCharacteristicValue";
import { readBeerCharacteristic } from "@/utils/beer/readBeerCharacteristic";
import { getCurrentUserId } from "@/utils/currentUser/getCurrentUserId";

const SWATCH_BASE_CLASSES = "size-6 shrink-0 rounded-full border-mousse";

export const TechnicalSheet = ({ beer }: TechnicalSheetProps) => {
  const { t, i18n } = useTranslation();
  const { corrections, isPending: isCorrectionsPending, isError: isCorrectionsError } = useBeerCorrectionsQuery(beer.id);
  const isAuthor = beer.source === BeerSourceEnum.COMMUNITY && beer.createdBy !== null && beer.createdBy === getCurrentUserId();
  const canPropose = !isCorrectionsPending && !isCorrectionsError && !isAuthor;

  const getColorLabel = (level: number) => t(COLOR_LEVEL_LABEL_KEYS[level - 1]);

  const renderSwatch = (level: number) => (
    <span key={level} aria-hidden="true" className={`${SWATCH_BASE_CLASSES} ${COLOR_LEVEL_SWATCH_CLASSES[level - 1]}`} />
  );

  const renderStyleColorHint = () => {
    if (beer.styleColorRange === null) return null;
    const { min, max } = beer.styleColorRange;
    if (min === max) {
      return (
        <span className="flex basis-full flex-wrap items-center gap-2">
          {renderSwatch(min)}
          <span>{t("pages.beerDetail.levels.styleSingle", { label: getColorLabel(min) })}</span>
        </span>
      );
    }
    return (
      <span className="flex basis-full flex-wrap items-center gap-2">
        {renderSwatch(min)}
        {renderSwatch(max)}
        <span>
          {t("pages.beerDetail.levels.styleRange", {
            min: getColorLabel(min),
            max: getColorLabel(max).toLocaleLowerCase(i18n.language),
          })}
        </span>
      </span>
    );
  };

  const renderValue = (characteristic: BeerCharacteristicEnum) => {
    const value = readBeerCharacteristic(beer, characteristic);
    const text = formatCharacteristicValue(characteristic, value, t, i18n.language);

    if (characteristic === BeerCharacteristicEnum.IBU && value !== null && beer.bitternessLevel !== null) {
      return (
        <span>
          {t("beer.characteristics.withLevel", { value: text, level: t(BITTERNESS_LEVEL_LABEL_KEYS[beer.bitternessLevel - 1]) })}
        </span>
      );
    }
    if (characteristic === BeerCharacteristicEnum.EBC && value === null) {
      return (
        <>
          <span>{text}</span>
          {renderStyleColorHint()}
        </>
      );
    }
    if (characteristic === BeerCharacteristicEnum.EBC && beer.colorLevel !== null) {
      return (
        <>
          {renderSwatch(beer.colorLevel)}
          <span>{t("beer.characteristics.withLevel", { value: text, level: getColorLabel(beer.colorLevel) })}</span>
        </>
      );
    }
    if (characteristic === BeerCharacteristicEnum.AROMAS && value !== null) {
      return beer.aromas.map((aroma) => (
        <Chip key={aroma} color="accent" variant="primary">
          {t(BEER_AROMA_LABEL_KEYS[aroma])}
        </Chip>
      ));
    }
    if (characteristic === BeerCharacteristicEnum.FORMATS && value !== null) {
      return beer.formats.map((format) => (
        <Chip key={format} color="accent" variant="primary">
          {t(BEER_FORMAT_LABEL_KEYS[format])}
        </Chip>
      ));
    }
    return <span>{text}</span>;
  };

  const renderCorrections = (characteristic: BeerCharacteristicEnum) => {
    const characteristicCorrections = corrections.filter((correction) => correction.characteristic === characteristic);
    if (characteristicCorrections.length === 0 && canPropose) {
      return (
        <div className="min-w-0 basis-full">
          <ProposeCorrectionSheet
            beerId={beer.id}
            characteristic={characteristic}
            currentValue={readBeerCharacteristic(beer, characteristic)}
          />
        </div>
      );
    }
    return characteristicCorrections.map((correction) => (
      <div key={correction.id} className="min-w-0 basis-full">
        <CorrectionCard correction={correction} />
      </div>
    ));
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-xl text-foreground">{t("pages.beerDetail.technicalSheet.title")}</h2>
      <dl className="flex flex-col gap-3 rounded-mousse border-mousse bg-surface p-4 shadow-mousse">
        {BEER_CHARACTERISTICS.map((characteristic) => (
          <TechnicalSheetRow key={characteristic} label={t(BEER_CHARACTERISTIC_LABEL_KEYS[characteristic])}>
            {renderValue(characteristic)}
            {renderCorrections(characteristic)}
          </TechnicalSheetRow>
        ))}
      </dl>
    </section>
  );
};
