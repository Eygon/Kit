import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

export const EncyclopediaPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("pages.encyclopedia.title")} subtitle={t("pages.encyclopedia.subtitle")} />
      <EmptyStatePanel
        mood={MascotMoodEnum.SEARCHING}
        title={t("pages.encyclopedia.emptyTitle")}
        description={t("pages.encyclopedia.emptyDescription")}
      />
    </div>
  );
};
