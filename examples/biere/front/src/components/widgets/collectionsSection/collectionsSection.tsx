import { Alert, Button, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import type { CollectionsSectionProps } from "@/types/components/collectionsSection";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { buildUserProfilePath } from "@/types/enums/routing/routePathEnum";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";

const SKELETON_ROW_COUNT = 3;
const SKELETON_ROW_KEYS = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index);
const LIST_CLASSES = "flex flex-col gap-3";
const ROW_CLASSES = "flex min-w-0 items-center justify-between gap-3 rounded-mousse border-mousse bg-surface p-3 shadow-mousse";

const CollectionsSkeleton = () => (
  <ul aria-busy="true" className={LIST_CLASSES}>
    {SKELETON_ROW_KEYS.map((key) => (
      <li key={key} data-testid="collections-skeleton" className={ROW_CLASSES}>
        <Skeleton className="h-5 w-40 max-w-full" />
        <Skeleton className="h-5 w-16 shrink-0" />
      </li>
    ))}
  </ul>
);

const buildCollectionPath = (userId: number, { id, kind }: CollectionSummary): string => {
  const profilePath = buildUserProfilePath(userId);
  return kind === CollectionKindEnum.WISHLIST || id === null ? `${profilePath}/wishlist` : `${profilePath}/collections/${id}`;
};

export const CollectionsSection = ({ userId, ownerName, collections, isPending, isError, onRetry }: CollectionsSectionProps) => {
  const { t } = useTranslation();

  const renderContent = () => {
    if (isPending) return <CollectionsSkeleton />;
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("collections.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={onRetry}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (collections.length === 0)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("collections.emptyTitle")}
          description={t("collections.emptyDescription")}
        />
      );

    return (
      <ul className={LIST_CLASSES}>
        {collections.map((collection) => (
          <li key={collection.id ?? collection.kind} className={ROW_CLASSES}>
            <Link to={buildCollectionPath(userId, collection)} className="flex min-h-11 min-w-0 flex-1 items-center font-bold break-words">
              {collection.kind === CollectionKindEnum.WISHLIST ? t("collections.wishlist") : collection.name}
            </Link>
            <span className="shrink-0 text-muted">{t("collections.beerCount", { count: collection.beerCount })}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl">{ownerName === undefined ? t("collections.title") : t("collections.titleOf", { name: ownerName })}</h2>
      {renderContent()}
    </section>
  );
};
