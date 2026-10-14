import { Alert, Button, Skeleton } from "@heroui/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { CheckinEntry } from "@/components/elements/checkinEntry/checkinEntry";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { CheckinSheet } from "@/components/modules/checkinSheet/checkinSheet";
import { DeleteCheckinButton } from "@/pages/journal/components/elements/deleteCheckinButton/deleteCheckinButton";
import { useJournalQuery } from "@/pages/journal/hooks/useJournalQuery";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

const SKELETON_ROW_KEYS = ["first", "second", "third"];

export const JournalPage = () => {
  const { t } = useTranslation();
  const {
    checkins,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useJournalQuery();
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
        <Alert.Title>{t("pages.journal.errorTitle")}</Alert.Title>
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
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.journal.emptyTitle")}
          description={t("pages.journal.emptyDescription")}
        />
      );

    return (
      <>
        <ol className="flex flex-col gap-3 border-mousse border-y-0 border-r-0 pl-3">
          {checkins.map((checkin) => (
            <CheckinEntry
              key={checkin.id}
              checkin={checkin}
              showBeer
              actions={
                <>
                  <CheckinSheet
                    checkin={checkin}
                    renderDeleteAction={(close) => (
                      <DeleteCheckinButton checkinId={checkin.id} isTextTrigger onDeleted={close} />
                    )}
                  />
                  <DeleteCheckinButton checkinId={checkin.id} />
                </>
              }
            />
          ))}
        </ol>
        {isError && errorAlert}
        {hasNextPage && (
          <div>
            <Button
              variant="secondary"
              size="lg"
              isPending={isFetchingNextPage}
              onPress={() => void loadMore()}
            >
              {t("pages.journal.loadMore")}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("pages.journal.title")}
        subtitle={t("pages.journal.subtitle")}
      />
      {renderBody()}
    </div>
  );
};
