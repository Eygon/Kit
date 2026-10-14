import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CheckinPhoto } from "@/components/elements/checkinPhoto/checkinPhoto";
import { ExpandableText } from "@/components/elements/expandableText/expandableText";
import type { CheckinEntryProps } from "@/types/components/checkinEntry";
import { BEER_FORMAT_LABEL_KEYS } from "@/types/enums/beer/beerFormatEnum";
import { buildBeerDetailPath, buildMapPathForVenue } from "@/types/enums/routing/routePathEnum";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";

const BEER_LINK_CLASSES =
  "min-h-11 break-words text-accent focus-visible:focus-ring";

const PRICE_FORMAT_OPTIONS: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };

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

  const priceText =
    checkin.price === null ? null : new Intl.NumberFormat(i18n.language, PRICE_FORMAT_OPTIONS).format(checkin.price);
  const hasDetails = checkin.format !== null || priceText !== null;

  const hasTrailing =
    checkin.photoId !== null || ratingText !== null || Boolean(actions);

  return (
    <li className="flex min-w-0 flex-col gap-1 rounded-mousse border-mousse bg-surface p-3 shadow-mousse">
      <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col">
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
        {checkin.venueId !== null ? (
          <Link
            to={buildMapPathForVenue(checkin.venueId)}
            className={BEER_LINK_CLASSES}
          >
            {checkin.place}
          </Link>
        ) : (
          <span className="break-words">{checkin.place}</span>
        )}
      </div>
      {hasTrailing && (
        <div className="flex shrink-0 items-center gap-2">
          {checkin.photoId !== null && (
            <CheckinPhoto
              photoId={checkin.photoId}
              alt={t("common.photo.alt")}
            />
          )}
          {ratingText !== null && (
            <span className="shrink-0 rounded-full border-mousse bg-highlight px-3 py-0.5 font-display text-sm text-highlight-foreground">
              <span aria-hidden="true">
                {t("pages.beerDetail.history.rating", { rating: ratingText })}
              </span>
              <span className="sr-only">
                {t("pages.beerDetail.history.ratingLabel", {
                  rating: ratingText,
                })}
              </span>
            </span>
          )}
          {actions}
        </div>
      )}
      </div>
      {hasDetails && (
        <div className="flex flex-wrap gap-x-3 text-sm text-muted">
          {checkin.format !== null && <span>{t(BEER_FORMAT_LABEL_KEYS[checkin.format])}</span>}
          {priceText !== null && <span>{priceText}</span>}
        </div>
      )}
      {checkin.comment.trim() !== "" && <ExpandableText text={checkin.comment} />}
    </li>
  );
};
