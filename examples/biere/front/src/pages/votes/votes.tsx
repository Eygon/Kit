import { Alert, Button, Disclosure, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { CorrectionCard } from "@/components/elements/correctionCard/correctionCard";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { useCorrectionBoardQuery } from "@/hooks/corrections/useCorrectionBoardQuery";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

const SKELETON_CARD_KEYS = ["first", "second", "third"];
const TRIGGER_CLASSES = "flex min-h-11 w-full items-center justify-between gap-2 text-left";

export const VotesPage = () => {
  const { t } = useTranslation();
  const { board, isPending, isError, refetch } = useCorrectionBoardQuery();

  const renderOpen = () => {
    if (isPending)
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          {SKELETON_CARD_KEYS.map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
      );
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.votes.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (board.open.length === 0)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.votes.emptyTitle")}
          description={t("pages.votes.emptyDescription")}
        />
      );
    return (
      <ul className="flex flex-col gap-3">
        {board.open.map((correction) => (
          <li key={correction.id} className="flex min-w-0 flex-col">
            <CorrectionCard correction={correction} isBeerShown />
          </li>
        ))}
      </ul>
    );
  };

  const renderRecentlyClosed = () => {
    if (isPending || isError || board.recentlyClosed.length === 0) return null;
    return (
      <Disclosure>
        <Disclosure.Heading level={2}>
          <Disclosure.Trigger className={TRIGGER_CLASSES}>
            {t("pages.votes.recentlyClosed", { count: board.recentlyClosed.length })}
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>
            <ul className="flex flex-col gap-3">
              {board.recentlyClosed.map((correction) => (
                <li key={correction.id} className="flex min-w-0 flex-col">
                  <CorrectionCard correction={correction} isBeerShown />
                </li>
              ))}
            </ul>
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("pages.votes.title")} subtitle={t("pages.votes.intro")} />
      {renderOpen()}
      {renderRecentlyClosed()}
    </div>
  );
};
