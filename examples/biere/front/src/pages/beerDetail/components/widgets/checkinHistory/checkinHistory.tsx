import { Alert, Button, Skeleton } from "@heroui/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { CheckinEntry } from "@/components/elements/checkinEntry/checkinEntry";
import { useBeerCheckinsQuery } from "@/pages/beerDetail/hooks/useBeerCheckinsQuery";
import type { CheckinHistoryProps } from "@/pages/beerDetail/types/checkinHistory";

const SKELETON_ROW_KEYS = ["first", "second", "third"];

export const CheckinHistory = ({ beerId }: CheckinHistoryProps) => {
  const { t } = useTranslation();
  const {
    checkins,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBeerCheckinsQuery(beerId);
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

  const hasCheckins = checkins.length > 0;
  const retry = hasCheckins ? loadMore : refetch;

  const errorAlert = (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t("pages.beerDetail.history.errorTitle")}</Alert.Title>
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
          {SKELETON_ROW_KEYS.map((key) => (
            <Skeleton key={key} className="h-14 w-full" />
          ))}
        </div>
      );
    if (!hasCheckins && isError) return errorAlert;
    if (!hasCheckins)
      return (
        <p className="text-muted">{t("pages.beerDetail.history.empty")}</p>
      );

    return (
      <>
        <ul className="flex flex-col gap-3">
          {checkins.map((checkin) => (
            <CheckinEntry key={checkin.id} checkin={checkin} showBeer={false} />
          ))}
        </ul>
        {isError && errorAlert}
        {hasNextPage && (
          <div>
            <Button
              variant="secondary"
              size="lg"
              isPending={isFetchingNextPage}
              onPress={() => void loadMore()}
            >
              {t("pages.beerDetail.history.loadMore")}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">
        {t("pages.beerDetail.history.title")}
      </h2>
      {renderBody()}
    </section>
  );
};
