import { Alert, Button, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { AvailabilityBadge } from "@/components/elements/availabilityBadge/availabilityBadge";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { VenueDiscoverySummary } from "@/pages/map/components/elements/venueDiscoverySummary/venueDiscoverySummary";
import { VenueBeerStamp } from "@/pages/map/components/elements/venueBeerStamp/venueBeerStamp";
import { VoteButtons } from "@/pages/map/components/elements/voteButtons/voteButtons";
import { useUndrunkOnlyFilter } from "@/pages/map/hooks/useUndrunkOnlyFilter";
import { useVenueBeersQuery } from "@/pages/map/hooks/useVenueBeersQuery";
import type { VenueBeerListProps } from "@/pages/map/types/venueBeerList";
import { BEER_FAMILY_LABEL_KEYS } from "@/types/enums/beer/beerFamilyEnum";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { venueBeersToFamilyGroups } from "@/types/mappers/venue/venueBeerGroupMapper";
import { getAvailabilityDetail } from "@/utils/availability/getAvailabilityDetail";

const SKELETON_ROW_COUNT = 3;
const SKELETON_ROW_KEYS = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index);

const VenueBeerListSkeleton = () => (
  <div className="flex min-w-0 flex-col gap-3" aria-busy="true">
    {SKELETON_ROW_KEYS.map((key) => (
      <div
        key={key}
        data-testid="venue-beer-skeleton"
        className="flex flex-col gap-2 rounded-mousse border-mousse bg-surface p-3"
      >
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

export const VenueBeerList = ({ venueId }: VenueBeerListProps) => {
  const { t } = useTranslation();
  const { beers, isPending, isError, refetch } = useVenueBeersQuery(venueId);
  const { isUndrunkOnly, setUndrunkOnly } = useUndrunkOnlyFilter();
  const now = new Date();

  if (isPending) return <VenueBeerListSkeleton />;
  if (isError)
    return (
      <Alert status="danger" role="alert">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t("pages.map.venueBeers.errorTitle")}</Alert.Title>
        </Alert.Content>
        <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
          {t("common.retry")}
        </Button>
      </Alert>
    );
  if (beers.length === 0)
    return (
      <EmptyStatePanel
        mood={MascotMoodEnum.SEARCHING}
        title={t("pages.map.venueBeers.emptyTitle")}
        description={t("pages.map.venueBeers.emptyDescription")}
      />
    );

  const undrunkBeers = beers.filter((beer) => !beer.drunk);
  const shownBeers = isUndrunkOnly ? undrunkBeers : beers;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <VenueDiscoverySummary
        undiscoveredCount={undrunkBeers.length}
        isUndrunkOnly={isUndrunkOnly}
        onUndrunkOnlyChange={setUndrunkOnly}
      />
      {shownBeers.length === 0 && (
        <EmptyStatePanel
          mood={MascotMoodEnum.CAPTURED}
          title={t("pages.map.venueBeers.discovery.emptyTitle")}
          description={t("pages.map.venueBeers.discovery.emptyDescription")}
        />
      )}
      {venueBeersToFamilyGroups(shownBeers).map((group, index) => (
        <section key={`${group.family ?? "other"}-${index}`} className="flex min-w-0 flex-col gap-2">
          <h3 className="font-bold text-foreground">
            {group.family === null ? t("pages.map.venueBeers.otherFamily") : t(BEER_FAMILY_LABEL_KEYS[group.family])}
          </h3>
          <ul className="flex min-w-0 flex-col gap-2">
            {group.beers.map((beer) => {
              const detail = getAvailabilityDetail(beer.lastConfirmedAt, beer.recentVoterCount, now);
              return (
                <li
                  key={beer.beerId}
                  className="flex min-w-0 flex-col items-start gap-1 rounded-mousse border-mousse bg-surface p-3"
                >
                  <span className="min-w-0 font-bold break-words text-foreground">{beer.beerName}</span>
                  <span className="min-w-0 text-sm break-words text-muted">{beer.breweryName}</span>
                  <VenueBeerStamp
                    drunk={beer.drunk}
                    checkinCount={beer.checkinCount}
                    lastCheckinAt={beer.lastCheckinAt}
                  />
                  <AvailabilityBadge status={beer.status} />
                  <span className="min-w-0 text-sm break-words text-muted">{t(detail.key, detail.values)}</span>
                  <VoteButtons venueId={venueId} venueBeer={beer} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
