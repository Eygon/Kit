import { Alert, Button, ProgressCircle, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { FamilyProgressSectionProps } from "@/pages/profile/types/familyProgressSection";
import { BEER_FAMILY_LABEL_KEYS } from "@/types/enums/beer/beerFamilyEnum";

const SKELETON_TILE_COUNT = 18;
const SKELETON_TILE_KEYS = Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => index);
const GRID_CLASSES = "grid grid-cols-2 gap-3 md:grid-cols-3";
const TILE_CLASSES = "flex min-w-0 flex-col items-center gap-2 text-center";

const FamilyProgressSkeleton = () => (
  <ul aria-busy="true" className={GRID_CLASSES}>
    {SKELETON_TILE_KEYS.map((key) => (
      <li key={key} data-testid="family-progress-skeleton" className={TILE_CLASSES}>
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </li>
    ))}
  </ul>
);

export const FamilyProgressSection = ({ dex, isPending, isError, onRetry }: FamilyProgressSectionProps) => {
  const { t } = useTranslation();

  const renderContent = () => {
    if (isPending) return <FamilyProgressSkeleton />;
    if (isError || dex === null)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.profile.progress.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={onRetry}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    return (
      <>
        <p className="font-display text-2xl">
          {t("pages.profile.progress.summary", { discovered: dex.discovered, total: dex.total })}
        </p>
        <ul className={GRID_CLASSES}>
          {dex.families.map(({ family, discovered, total }) => {
            const familyName = t(BEER_FAMILY_LABEL_KEYS[family]);
            return (
              <li key={family} className={TILE_CLASSES}>
                <ProgressCircle
                  aria-label={t("pages.profile.progress.ringLabel", { family: familyName, discovered, total })}
                  value={discovered}
                  maxValue={Math.max(total, 1)}
                  color="accent"
                  size="lg"
                >
                  <ProgressCircle.Track>
                    <ProgressCircle.TrackCircle />
                    <ProgressCircle.FillCircle />
                  </ProgressCircle.Track>
                </ProgressCircle>
                <span className="break-words text-sm">
                  {t("pages.profile.progress.family", { family: familyName, discovered, total })}
                </span>
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl">{t("pages.profile.progress.title")}</h2>
      {renderContent()}
    </section>
  );
};
