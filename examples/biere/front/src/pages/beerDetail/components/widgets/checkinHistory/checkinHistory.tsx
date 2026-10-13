import { Alert, Button, Skeleton } from "@heroui/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useBeerCheckinsQuery } from "@/pages/beerDetail/hooks/useBeerCheckinsQuery";
import type { CheckinHistoryProps } from "@/pages/beerDetail/types/checkinHistory";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";

const SKELETON_ROW_KEYS = ["first", "second", "third"];

export const CheckinHistory = ({ beerId }: CheckinHistoryProps) => {
  const { t, i18n } = useTranslation();
  const { checkins, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useBeerCheckinsQuery(beerId);
  const isLoadingMore = useRef(false);
  const ratingFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });

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
    if (!hasCheckins) return <p className="text-muted">{t("pages.beerDetail.history.empty")}</p>;

    return (
      <>
        <ul className="flex flex-col gap-3">
          {checkins.map((checkin) => (
            <li
              key={checkin.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-mousse border-mousse bg-surface p-3 shadow-mousse"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-sm text-muted">{formatCheckinDate(checkin.drankAt, i18n.language)}</span>
                <span className="break-words">{checkin.place}</span>
              </div>
              {checkin.rating !== null && (
                <span className="shrink-0 rounded-full border-mousse bg-highlight px-3 py-0.5 font-display text-sm text-highlight-foreground">
                  <span aria-hidden="true">
                    {t("pages.beerDetail.history.rating", { rating: ratingFormat.format(checkin.rating) })}
                  </span>
                  <span className="sr-only">
                    {t("pages.beerDetail.history.ratingLabel", { rating: ratingFormat.format(checkin.rating) })}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
        {isError && errorAlert}
        {hasNextPage && (
          <div>
            <Button variant="secondary" size="lg" isPending={isFetchingNextPage} onPress={() => void loadMore()}>
              {t("pages.beerDetail.history.loadMore")}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">{t("pages.beerDetail.history.title")}</h2>
      {renderBody()}
    </section>
  );
};
