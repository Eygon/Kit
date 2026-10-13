import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { DemoUserSelect } from "@/pages/profile/components/widgets/demoUserSelect/demoUserSelect";
import { useCurrentUser } from "@/pages/profile/hooks/useCurrentUser";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

export const ProfilePage = () => {
  const { t } = useTranslation();
  const { currentUserId, changeCurrentUser } = useCurrentUser();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("pages.profile.title")} subtitle={t("pages.profile.subtitle")} />
      <DemoUserSelect selectedUserId={currentUserId} onSelectUser={changeCurrentUser} />
      <EmptyStatePanel
        mood={MascotMoodEnum.LOADED}
        title={t("pages.profile.emptyTitle")}
        description={t("pages.profile.emptyDescription")}
      />
    </div>
  );
};
