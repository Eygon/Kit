import { Alert, Button, Chip, Disclosure, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import type { BadgeSectionProps } from "@/pages/profile/types/badgeSection";
import { BADGE_KIND_CRITERION_KEYS, BADGE_KIND_LABEL_KEYS, BadgeKindEnum } from "@/types/enums/badge/badgeKindEnum";
import { BEER_FAMILY_LABEL_KEYS } from "@/types/enums/beer/beerFamilyEnum";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import type { Badge } from "@/types/models/badge/badge";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";

const SKELETON_TILE_COUNT = 9;
const SKELETON_TILE_KEYS = Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => index);
const GRID_CLASSES = "grid grid-cols-2 gap-3 md:grid-cols-3";
const TILE_CLASSES = "flex min-w-0 flex-col items-start gap-2 rounded-mousse border-mousse bg-surface p-3 shadow-mousse";
const FAMILY_ROW_CLASSES = "flex min-w-0 flex-col items-start gap-1 py-2";
const TRIGGER_CLASSES = "flex min-h-11 w-full items-center justify-between gap-2 text-left";

const BadgeSkeleton = () => (
  <ul aria-busy="true" className={GRID_CLASSES}>
    {SKELETON_TILE_KEYS.map((key) => (
      <li key={key} data-testid="badge-skeleton" className={TILE_CLASSES}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" />
      </li>
    ))}
  </ul>
);

export const BadgeSection = ({ badges, isPending, isError, onRetry }: BadgeSectionProps) => {
  const { t, i18n } = useTranslation();

  const renderState = ({ unlockedAt, comingSoon, current, target }: Badge) => {
    if (unlockedAt !== null)
      return (
        <Chip color="accent" variant="primary">
          {t("pages.profile.badges.unlockedOn", { date: formatCheckinDate(unlockedAt, i18n.language, "Europe/Paris") })}
        </Chip>
      );
    if (comingSoon) return <Chip>{t("pages.profile.badges.comingSoon")}</Chip>;
    return <span className="text-sm">{t("pages.profile.badges.progress", { current, target })}</span>;
  };

  const renderSpecialistGroup = (specialists: Badge[]) => (
    <Disclosure>
      <Disclosure.Heading>
        <Disclosure.Trigger className={TRIGGER_CLASSES}>
          {t("pages.profile.badges.specialistGroup", {
            unlocked: specialists.filter(({ unlockedAt }) => unlockedAt !== null).length,
            total: specialists.length,
          })}
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>
          <ul className="flex flex-col divide-y divide-separator">
            {specialists.map((badge) => (
              <li key={badge.id} className={FAMILY_ROW_CLASSES}>
                <span className="break-words text-sm">
                  {t(badge.family === null ? BADGE_KIND_LABEL_KEYS[badge.kind] : BEER_FAMILY_LABEL_KEYS[badge.family])}
                </span>
                {renderState(badge)}
              </li>
            ))}
          </ul>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );

  const renderContent = () => {
    if (isPending) return <BadgeSkeleton />;
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.profile.badges.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={onRetry}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (badges.length === 0)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.profile.badges.emptyTitle")}
          description={t("pages.profile.badges.emptyDescription")}
        />
      );
    return (
      <>
        <ul className={GRID_CLASSES}>
          {badges
            .filter(({ kind }) => kind !== BadgeKindEnum.SPECIALIST)
            .map((badge) => (
              <li key={badge.id} className={TILE_CLASSES}>
                <span className="break-words font-display text-sm">{t(BADGE_KIND_LABEL_KEYS[badge.kind])}</span>
                <span className="break-words text-sm text-muted">
                  {t(BADGE_KIND_CRITERION_KEYS[badge.kind], { count: badge.target })}
                </span>
                {renderState(badge)}
              </li>
            ))}
        </ul>
        {renderSpecialistGroup(badges.filter(({ kind }) => kind === BadgeKindEnum.SPECIALIST))}
      </>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl">{t("pages.profile.badges.title")}</h2>
      {renderContent()}
    </section>
  );
};
