import { Alert, Button, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AvailabilityBadge } from "@/components/elements/availabilityBadge/availabilityBadge";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { useBeerVenuesQuery } from "@/pages/beerDetail/hooks/useBeerVenuesQuery";
import type { WhereToDrinkSectionProps } from "@/pages/beerDetail/types/whereToDrinkSection";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { buildMapPathForBeer } from "@/types/enums/routing/routePathEnum";
import { VENUE_TYPE_LABEL_KEYS } from "@/types/enums/venue/venueTypeEnum";
import { getAvailabilityDetail } from "@/utils/availability/getAvailabilityDetail";

const MAX_VENUES_SHOWN = 3;
const SKELETON_ROW_KEYS = ["first", "second", "third"];

export const WhereToDrinkSection = ({ beerId }: WhereToDrinkSectionProps) => {
  const { t } = useTranslation();
  const { venues, isPending, isError, refetch } = useBeerVenuesQuery(beerId);

  const mapLink = (
    <Link
      to={buildMapPathForBeer(beerId)}
      className="inline-flex min-h-11 items-center justify-center text-link underline focus-visible:focus-ring"
    >
      {t("pages.beerDetail.whereToDrink.seeOnMap")}
    </Link>
  );

  const renderBody = () => {
    if (isPending)
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          {SKELETON_ROW_KEYS.map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      );
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.beerDetail.whereToDrink.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (venues.length === 0)
      return (
        <>
          <EmptyStatePanel
            mood={MascotMoodEnum.SEARCHING}
            title={t("pages.beerDetail.whereToDrink.emptyTitle")}
            description={t("pages.beerDetail.whereToDrink.emptyDescription")}
          />
          <div>{mapLink}</div>
        </>
      );

    const now = new Date();
    return (
      <>
        <ul className="flex flex-col gap-3">
          {venues.slice(0, MAX_VENUES_SHOWN).map((venue) => {
            const detail = getAvailabilityDetail(venue.lastConfirmedAt, venue.recentVoterCount, now);
            return (
              <li
                key={venue.venueId}
                className="flex min-w-0 flex-col gap-2 rounded-mousse border-mousse bg-surface p-3 shadow-mousse"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="break-words">{venue.venueName}</span>
                    <span className="text-sm break-words text-muted">
                      {venue.venueType === null
                        ? venue.city
                        : [t(VENUE_TYPE_LABEL_KEYS[venue.venueType]), venue.city].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <AvailabilityBadge status={venue.status} />
                  </div>
                </div>
                <span className="text-sm break-words text-muted">{t(detail.key, detail.values)}</span>
              </li>
            );
          })}
        </ul>
        <div>{mapLink}</div>
      </>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">{t("pages.beerDetail.whereToDrink.title")}</h2>
      {renderBody()}
    </section>
  );
};
