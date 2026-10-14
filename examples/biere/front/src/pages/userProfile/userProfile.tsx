import { useTranslation } from "react-i18next";
import { Link, Navigate, useParams } from "react-router";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { FollowButton } from "@/components/elements/followButton/followButton";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { CollectionsSection } from "@/components/widgets/collectionsSection/collectionsSection";
import { ProfileHeader } from "@/components/widgets/profileHeader/profileHeader";
import { useUserCollectionsQuery } from "@/hooks/collections/useUserCollectionsQuery";
import { useProfileQuery } from "@/hooks/profile/useProfileQuery";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { parseBeerIdParam, RoutePathEnum } from "@/types/enums/routing/routePathEnum";

export const UserProfilePage = () => {
  const { t } = useTranslation();
  const userId = parseBeerIdParam(useParams().userId);
  const { profile, isPending, isError, refetch } = useProfileQuery(userId);
  const collectionsQuery = useUserCollectionsQuery(profile?.id ?? 0, profile?.isFollowed === true);

  const isNotFound = userId === null || (profile === null && !isPending && !isError);

  if (isNotFound)
    return (
      <div className="flex flex-col gap-4">
        <EmptyStatePanel
          mood={MascotMoodEnum.CONFUSED}
          title={t("pages.userProfile.notFoundTitle")}
          description={t("pages.userProfile.notFoundDescription")}
        />
        <Link to={RoutePathEnum.PEOPLE} className="min-h-11 self-center text-accent focus-visible:focus-ring">
          {t("pages.userProfile.seeProfiles")}
        </Link>
      </div>
    );

  if (profile?.isMe) return <Navigate to={RoutePathEnum.PROFILE} replace />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={profile?.displayName ?? t("pages.people.title")} />
      <ProfileHeader
        profile={profile}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
        action={
          profile === null ? undefined : (
            <FollowButton userId={profile.id} displayName={profile.displayName} isFollowed={profile.isFollowed} />
          )
        }
      />
      {profile?.isFollowed === true && (
        <CollectionsSection
          userId={profile.id}
          ownerName={profile.displayName}
          collections={collectionsQuery.collections}
          isPending={collectionsQuery.isPending}
          isError={collectionsQuery.isError}
          onRetry={() => void collectionsQuery.refetch()}
        />
      )}
      {profile?.isFollowed === false && (
        <p className="text-muted">{t("collections.locked", { name: profile.displayName })}</p>
      )}
    </div>
  );
};
