import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

export const JournalPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("pages.journal.title")} subtitle={t("pages.journal.subtitle")} />
      <EmptyStatePanel
        mood={MascotMoodEnum.SEARCHING}
        title={t("pages.journal.emptyTitle")}
        description={t("pages.journal.emptyDescription")}
      />
    </div>
  );
};
