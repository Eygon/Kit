import { Alert, Button, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import type { WishlistSectionProps } from "@/pages/profile/types/wishlistSection";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { buildBeerDetailPath } from "@/types/enums/routing/routePathEnum";

const SKELETON_ROW_COUNT = 3;
const SKELETON_ROW_KEYS = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index);
const LIST_CLASSES = "flex flex-col gap-3";
const ROW_CLASSES = "flex min-w-0 items-center justify-between gap-3 rounded-mousse border-mousse bg-surface p-3 shadow-mousse";

const WishlistSkeleton = () => (
  <ul aria-busy="true" className={LIST_CLASSES}>
    {SKELETON_ROW_KEYS.map((key) => (
      <li key={key} data-testid="wishlist-skeleton" className={ROW_CLASSES}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11 w-24" />
      </li>
    ))}
  </ul>
);

export const WishlistSection = ({ items, isPending, isError, onRetry, onRemove, pendingBeerId }: WishlistSectionProps) => {
  const { t } = useTranslation();

  const renderContent = () => {
    if (isPending) return <WishlistSkeleton />;
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.profile.wishlist.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={onRetry}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (items.length === 0)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.profile.wishlist.emptyTitle")}
          description={t("pages.profile.wishlist.emptyDescription")}
        />
      );

    return (
      <ul className={LIST_CLASSES}>
        {items.map(({ beerId, beerName }) => (
          <li key={beerId} className={ROW_CLASSES}>
            <Link to={buildBeerDetailPath(beerId)} className="flex min-h-11 min-w-0 flex-1 items-center font-bold break-words">
              {beerName}
            </Link>
            <Button
              variant="tertiary"
              size="lg"
              className="shrink-0"
              aria-label={t("pages.profile.wishlist.removeLabel", { name: beerName })}
              isPending={pendingBeerId === beerId}
              onPress={() => onRemove(beerId)}
            >
              {t("pages.profile.wishlist.remove")}
            </Button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl">{t("pages.profile.wishlist.title")}</h2>
      {renderContent()}
    </section>
  );
};
