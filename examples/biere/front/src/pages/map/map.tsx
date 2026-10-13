import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

export const MapPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("pages.map.title")} subtitle={t("pages.map.subtitle")} />
      <EmptyStatePanel
        mood={MascotMoodEnum.SEARCHING}
        title={t("pages.map.emptyTitle")}
        description={t("pages.map.emptyDescription")}
      />
    </div>
  );
};
