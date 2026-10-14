import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { CollectionNameSheet } from "@/components/widgets/collectionNameSheet/collectionNameSheet";
import { CollectionsSection } from "@/components/widgets/collectionsSection/collectionsSection";
import { ProfileHeader } from "@/components/widgets/profileHeader/profileHeader";
import { useUserCollectionsQuery } from "@/hooks/collections/useUserCollectionsQuery";
import { useDexQuery } from "@/hooks/dex/useDexQuery";
import { useProfileQuery } from "@/hooks/profile/useProfileQuery";
import { BadgeSection } from "@/pages/profile/components/widgets/badgeSection/badgeSection";
import { DemoUserSelect } from "@/pages/profile/components/widgets/demoUserSelect/demoUserSelect";
import { EditProfileSheet } from "@/pages/profile/components/widgets/editProfileSheet/editProfileSheet";
import { FamilyProgressSection } from "@/pages/profile/components/widgets/familyProgressSection/familyProgressSection";
import { ShareProgressButton } from "@/pages/profile/components/elements/shareProgressButton/shareProgressButton";
import { WishlistSection } from "@/pages/profile/components/widgets/wishlistSection/wishlistSection";
import { StatsSection } from "@/pages/profile/components/widgets/statsSection/statsSection";
import { LanguageSelect } from "@/pages/profile/components/widgets/languageSelect/languageSelect";
import { useBadgesQuery } from "@/pages/profile/hooks/useBadgesQuery";
import { useCreateCollectionMutation } from "@/pages/profile/hooks/useCreateCollectionMutation";
import { useCurrentUser } from "@/pages/profile/hooks/useCurrentUser";
import { useRemoveFromWishlistMutation } from "@/pages/profile/hooks/useRemoveFromWishlistMutation";
import { useStatsQuery } from "@/pages/profile/hooks/useStatsQuery";
import { useWishlistQuery } from "@/pages/profile/hooks/useWishlistQuery";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import { isLanguage, LanguageEnum } from "@/types/enums/i18n/languageEnum";

export const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { currentUserId, changeCurrentUser } = useCurrentUser();
  const profileQuery = useProfileQuery(currentUserId);
  const collectionsQuery = useUserCollectionsQuery(currentUserId, true);
  const { dex, isPending, isError, refetch } = useDexQuery();
  const badgesQuery = useBadgesQuery();
  const statsQuery = useStatsQuery();
  const wishlistQuery = useWishlistQuery();
  const { removeItem, pendingBeerId } = useRemoveFromWishlistMutation();
  const { createCollection, isPending: isCreatingCollection } =
    useCreateCollectionMutation();
  const customCollectionCount = collectionsQuery.collections.filter(
    ({ kind }) => kind === CollectionKindEnum.CUSTOM,
  ).length;
  const selectedLanguage = isLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : LanguageEnum.FR;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("pages.profile.title")}
        subtitle={t("pages.profile.subtitle")}
      />
      <ProfileHeader
        profile={profileQuery.profile}
        isPending={profileQuery.isPending}
        isError={profileQuery.isError}
        onRetry={() => void profileQuery.refetch()}
        action={
          profileQuery.profile === null ? undefined : (
            <EditProfileSheet profile={profileQuery.profile} />
          )
        }
      />
      <CollectionsSection
        userId={currentUserId}
        collections={collectionsQuery.collections}
        isPending={collectionsQuery.isPending}
        isError={collectionsQuery.isError}
        onRetry={() => void collectionsQuery.refetch()}
        action={
          <CollectionNameSheet
            customCollectionCount={customCollectionCount}
            isPending={isCreatingCollection}
            onSave={createCollection}
          />
        }
      />
      <DemoUserSelect
        selectedUserId={currentUserId}
        onSelectUser={changeCurrentUser}
      />
      <LanguageSelect
        selectedLanguage={selectedLanguage}
        onSelectLanguage={(language) => void i18n.changeLanguage(language)}
      />
      <FamilyProgressSection
        dex={dex}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
      />
      <ShareProgressButton
        discovered={dex?.discovered ?? 0}
        total={dex?.total ?? 0}
        isDisabled={dex === null}
      />
      <BadgeSection
        badges={badgesQuery.badges}
        isPending={badgesQuery.isPending}
        isError={badgesQuery.isError}
        onRetry={() => void badgesQuery.refetch()}
      />
      <StatsSection
        stats={statsQuery.stats}
        isPending={statsQuery.isPending}
        isError={statsQuery.isError}
        onRetry={() => void statsQuery.refetch()}
      />
      <WishlistSection
        items={wishlistQuery.items}
        isPending={wishlistQuery.isPending}
        isError={wishlistQuery.isError}
        onRetry={() => void wishlistQuery.refetch()}
        onRemove={removeItem}
        pendingBeerId={pendingBeerId}
      />
    </div>
  );
};
