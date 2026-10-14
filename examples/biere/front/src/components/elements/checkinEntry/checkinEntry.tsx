import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CheckinPhoto } from "@/components/elements/checkinPhoto/checkinPhoto";
import type { CheckinEntryProps } from "@/types/components/checkinEntry";
import { buildBeerDetailPath } from "@/types/enums/routing/routePathEnum";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";

const BEER_LINK_CLASSES =
  "min-h-11 break-words text-accent focus-visible:focus-ring";

export const CheckinEntry = ({
  checkin,
  showBeer,
  actions,
}: CheckinEntryProps) => {
  const { t, i18n } = useTranslation();
  const ratingText =
    checkin.rating === null
      ? null
      : new Intl.NumberFormat(i18n.language, {
          maximumFractionDigits: 1,
        }).format(checkin.rating);

  return (
    <li className="flex min-w-0 items-center justify-between gap-3 rounded-mousse border-mousse bg-surface p-3 shadow-mousse">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm text-muted">
          {formatCheckinDate(checkin.drankAt, i18n.language)}
        </span>
        {showBeer && (
          <Link
            to={buildBeerDetailPath(checkin.beerId)}
            className={BEER_LINK_CLASSES}
          >
            {checkin.beerName}
          </Link>
        )}
        <span className="break-words">{checkin.place}</span>
      </div>
      {checkin.photoId !== null && (
        <CheckinPhoto photoId={checkin.photoId} alt={t("common.photo.alt")} />
      )}
      {ratingText !== null && (
        <span className="shrink-0 rounded-full border-mousse bg-highlight px-3 py-0.5 font-display text-sm text-highlight-foreground">
          <span aria-hidden="true">
            {t("pages.beerDetail.history.rating", { rating: ratingText })}
          </span>
          <span className="sr-only">
            {t("pages.beerDetail.history.ratingLabel", { rating: ratingText })}
          </span>
        </span>
      )}
      {actions}
    </li>
  );
};
