import { Alert, Button, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { MonthlyCheckinsChart } from "@/pages/profile/components/elements/monthlyCheckinsChart/monthlyCheckinsChart";
import type { StatsSectionProps } from "@/pages/profile/types/statsSection";
import { BEER_FAMILY_LABEL_KEYS } from "@/types/enums/beer/beerFamilyEnum";
import { formatAbv } from "@/utils/beer/formatAbv";
import { getCountryName } from "@/utils/country/getCountryName";

const SKELETON_TILE_COUNT = 7;
const SKELETON_TILE_KEYS = Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => index);
const MAX_RATING_FRACTION_DIGITS = 1;
const GRID_CLASSES = "grid grid-cols-2 gap-3";
const TILE_CLASSES = "flex min-w-0 flex-col gap-1 rounded-mousse border-mousse bg-surface p-3 shadow-mousse";
const LABEL_CLASSES = "text-sm text-muted";
const VALUE_CLASSES = "font-display text-2xl break-words";

const StatsSkeleton = () => (
  <div aria-busy="true" className={GRID_CLASSES}>
    {SKELETON_TILE_KEYS.map((key) => (
      <div key={key} data-testid="stats-skeleton" className={`${TILE_CLASSES} h-20`}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-14" />
      </div>
    ))}
  </div>
);

export const StatsSection = ({ stats, isPending, isError, onRetry }: StatsSectionProps) => {
  const { t, i18n } = useTranslation();

  const renderContent = () => {
    if (isPending) return <StatsSkeleton />;
    if (isError || stats === null)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.profile.stats.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={onRetry}>
            {t("common.retry")}
          </Button>
        </Alert>
      );

    const none = t("pages.profile.stats.none");
    const tiles = [
      { key: "checkins", value: stats.checkinCount },
      { key: "discovered", value: stats.discoveredCount },
      { key: "averageAbv", value: stats.averageAbv === null ? none : formatAbv(stats.averageAbv, i18n.language) },
      {
        key: "averageRating",
        value:
          stats.averageRating === null
            ? none
            : t("pages.profile.stats.ratingValue", {
                rating: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: MAX_RATING_FRACTION_DIGITS }).format(
                  stats.averageRating,
                ),
              }),
      },
      { key: "favoriteFamily", value: stats.favoriteFamily === null ? none : t(BEER_FAMILY_LABEL_KEYS[stats.favoriteFamily]) },
      { key: "currentStreak", value: t("pages.profile.stats.days", { count: stats.currentStreak }) },
      { key: "bestStreak", value: t("pages.profile.stats.days", { count: stats.bestStreak }) },
    ];

    return (
      <>
        <dl className={GRID_CLASSES}>
          {tiles.map(({ key, value }) => (
            <div key={key} className={TILE_CLASSES}>
              <dt className={LABEL_CLASSES}>{t(`pages.profile.stats.${key}`)}</dt>
              <dd className={VALUE_CLASSES}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-2">
          <h3 className={LABEL_CLASSES}>{t("pages.profile.stats.countries")}</h3>
          {stats.countries.length === 0 ? (
            <p className="font-display text-xl">{none}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {stats.countries.map(({ country, count }) => (
                <li key={country} className="rounded-full border-mousse bg-surface px-3 py-1 text-sm break-words">
                  {t("pages.profile.stats.countryCount", { country: getCountryName(country, i18n.language), count })}
                </li>
              ))}
            </ul>
          )}
        </div>
        {stats.monthlyCheckins.length > 0 && <MonthlyCheckinsChart months={stats.monthlyCheckins} />}
      </>
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl">{t("pages.profile.stats.title")}</h2>
      {renderContent()}
    </section>
  );
};
