import { Alert, Button, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { FollowButton } from "@/components/elements/followButton/followButton";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { ProfileRow } from "@/components/elements/profileRow/profileRow";
import { useProfilesQuery } from "@/pages/people/hooks/useProfilesQuery";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

const SKELETON_ROW_KEYS = ["first", "second", "third"];

export const PeoplePage = () => {
  const { t } = useTranslation();
  const { profiles, isPending, isError, refetch } = useProfilesQuery();

  const renderBody = () => {
    if (isPending)
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          {SKELETON_ROW_KEYS.map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      );
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.people.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (profiles.length === 0)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.people.emptyTitle")}
          description={t("pages.people.emptyDescription")}
        />
      );
    return (
      <ul className="flex flex-col gap-3">
        {profiles.map((profile) => (
          <ProfileRow
            key={profile.id}
            profile={profile}
            action={
              profile.isMe ? undefined : (
                <FollowButton userId={profile.id} displayName={profile.displayName} isFollowed={profile.isFollowed} />
              )
            }
          />
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("pages.people.title")} subtitle={t("pages.people.subtitle")} />
      {renderBody()}
    </div>
  );
};
