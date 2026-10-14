import { Alert, Button, Card, Skeleton } from "@heroui/react";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { BeerCard } from "@/pages/encyclopedia/components/elements/beerCard/beerCard";
import { DiscoveryProgress } from "@/pages/encyclopedia/components/elements/discoveryProgress/discoveryProgress";
import { CatalogSearchField } from "@/pages/encyclopedia/components/elements/catalogSearchField/catalogSearchField";
import { BeerFiltersDrawer } from "@/pages/encyclopedia/components/widgets/beerFiltersDrawer/beerFiltersDrawer";
import { FamilyChips } from "@/pages/encyclopedia/components/elements/familyChips/familyChips";
import { useBeerCatalogQuery } from "@/pages/encyclopedia/hooks/useBeerCatalogQuery";
import { useBeerFilters } from "@/pages/encyclopedia/hooks/useBeerFilters";
import { useDexQuery } from "@/hooks/dex/useDexQuery";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

const SKELETON_CARD_COUNT = 8;
const SKELETON_CARD_KEYS = Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => index);
const GRID_CLASSES = "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4";

const DexProgressSkeleton = () => (
  <div aria-busy="true" className="flex items-center gap-4">
    <Skeleton className="size-16 shrink-0 rounded-full" />
    <Skeleton className="h-6 w-40" />
  </div>
);

const BeerGridSkeleton = () => (
  <ul aria-busy="true" className={GRID_CLASSES}>
    {SKELETON_CARD_KEYS.map((key) => (
      <li key={key} className="min-w-0">
        <Card className="h-full min-w-0">
          <Card.Header className="gap-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card.Header>
          <Card.Content className="gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </Card.Content>
        </Card>
      </li>
    ))}
  </ul>
);

export const EncyclopediaPage = () => {
  const { t } = useTranslation();
  const { query, applyQuery, setSearch, setFamily, hasActiveFilters } = useBeerFilters();
  const { beers, total, facets, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useBeerCatalogQuery(query);
  const { dex, isPending: isDexPending, refetch: refetchDex } = useDexQuery();
  const isLoadingMore = useRef(false);
  const discoveredAtById = useMemo(
    () => new Map((dex?.beers ?? []).map((dexBeer) => [dexBeer.beerId, dexBeer.firstCheckinAt])),
    [dex],
  );

  const loadMore = async () => {
    if (isLoadingMore.current) return;
    isLoadingMore.current = true;
    try {
      await fetchNextPage();
    } finally {
      isLoadingMore.current = false;
    }
  };

  const hasBeers = beers.length > 0;
  const retry = hasBeers ? loadMore : refetch;

  const errorAlert = (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t("pages.encyclopedia.errorTitle")}</Alert.Title>
      </Alert.Content>
      <Button size="lg" variant="danger-soft" onPress={() => void retry()}>
        {t("common.retry")}
      </Button>
    </Alert>
  );

  const renderProgress = () => {
    if (isDexPending) return <DexProgressSkeleton />;
    if (dex === null)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.encyclopedia.progress.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={() => void refetchDex()}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    return <DiscoveryProgress discovered={dex.discovered} total={dex.total} />;
  };

  const renderContent = () => {
    if (isPending) return <BeerGridSkeleton />;
    if (!hasBeers && isError) return errorAlert;
    if (!hasBeers)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.encyclopedia.emptyTitle")}
          description={t("pages.encyclopedia.emptyDescription")}
        />
      );
    return (
      <>
        <ul className={GRID_CLASSES}>
          {beers.map((beer) => (
            <li key={beer.id} className="min-w-0">
              <BeerCard beer={beer} discoveredAt={beer.drunk ? (discoveredAtById.get(beer.id) ?? null) : null} />
            </li>
          ))}
        </ul>
        {isError && errorAlert}
        {hasNextPage && (
          <Button variant="secondary" size="lg" isPending={isFetchingNextPage} onPress={() => void loadMore()}>
            {t("pages.encyclopedia.loadMore")}
          </Button>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("pages.encyclopedia.title")} />
      {renderProgress()}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <CatalogSearchField value={query.search} onSearchChange={setSearch} />
        </div>
        {!isPending && <BeerFiltersDrawer appliedQuery={query} onApply={applyQuery} />}
      </div>
      <FamilyChips families={facets?.families ?? []} selectedFamily={query.family} onFamilyChange={setFamily} />
      {hasActiveFilters && !isPending && (
        <p aria-live="polite" className="text-sm text-muted">
          {t("pages.encyclopedia.resultCount", { count: total })}
        </p>
      )}
      {renderContent()}
    </div>
  );
};
