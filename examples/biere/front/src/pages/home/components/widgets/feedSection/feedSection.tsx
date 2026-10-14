import { Alert, Button, Skeleton } from "@heroui/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { FeedCard } from "@/pages/home/components/elements/feedCard/feedCard";
import { useFeedQuery } from "@/pages/home/hooks/useFeedQuery";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

const SKELETON_CARD_KEYS = ["first", "second", "third"];

export const FeedSection = () => {
  const { t } = useTranslation();
  const { items, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeedQuery();
  const [now] = useState(() => new Date());
  const isLoadingMore = useRef(false);

  const loadMore = async () => {
    if (isLoadingMore.current) return;
    isLoadingMore.current = true;
    try {
      await fetchNextPage();
    } finally {
      isLoadingMore.current = false;
    }
  };

  const hasItems = items.length > 0;
  const retry = hasItems ? loadMore : refetch;

  const errorAlert = (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t("pages.home.feed.errorTitle")}</Alert.Title>
      </Alert.Content>
      <Button size="lg" variant="danger-soft" onPress={() => void retry()}>
        {t("common.retry")}
      </Button>
    </Alert>
  );

  const renderBody = () => {
    if (isPending)
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          {SKELETON_CARD_KEYS.map((key) => (
            <Skeleton key={key} className="h-24 w-full rounded-mousse" />
          ))}
        </div>
      );
    if (!hasItems && isError) return errorAlert;
    if (!hasItems)
      return (
        <div className="flex flex-col gap-3">
          <EmptyStatePanel
            mood={MascotMoodEnum.SEARCHING}
            title={t("pages.home.feed.emptyTitle")}
            description={t("pages.home.feed.emptyDescription")}
          />
          <Link
            to={RoutePathEnum.PEOPLE}
            className="inline-flex min-h-11 items-center self-center text-link underline focus-visible:focus-ring"
          >
            {t("pages.home.feed.emptyAction")}
          </Link>
        </div>
      );

    return (
      <>
        <ol className="flex flex-col gap-3 pr-1 pb-1">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} now={now} />
          ))}
        </ol>
        {isError && errorAlert}
        {hasNextPage && (
          <div>
            <Button variant="secondary" size="lg" isPending={isFetchingNextPage} onPress={() => void loadMore()}>
              {t("pages.home.feed.loadMore")}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">{t("pages.home.feed.title")}</h2>
      {renderBody()}
    </section>
  );
};
