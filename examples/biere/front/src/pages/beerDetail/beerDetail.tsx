import { Alert, Button, Chip, Skeleton, ToggleButton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { CheckinHistory } from "@/pages/beerDetail/components/widgets/checkinHistory/checkinHistory";
import { CheckinSheet } from "@/pages/beerDetail/components/widgets/checkinSheet/checkinSheet";
import { useBeerQuery } from "@/pages/beerDetail/hooks/useBeerQuery";
import { useWishlistToggle } from "@/pages/beerDetail/hooks/useWishlistToggle";
import { BEER_AROMA_LABEL_KEYS } from "@/types/enums/beer/beerAromaEnum";
import { BEER_FAMILY_LABEL_KEYS } from "@/types/enums/beer/beerFamilyEnum";
import { BEER_FORMAT_LABEL_KEYS } from "@/types/enums/beer/beerFormatEnum";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { RoutePathEnum, parseBeerIdParam } from "@/types/enums/routing/routePathEnum";
import { formatAbv } from "@/utils/beer/formatAbv";
import { getCountryName } from "@/utils/country/getCountryName";

const DEFAULT_LOCATION_KEY = "default";

const BeerDetailSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export const BeerDetailPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const beerId = parseBeerIdParam(useParams().beerId);
  const { data: beer, isPending, isError, refetch } = useBeerQuery(beerId);
  const { toggleWishlist, isPending: isWishlistPending } = useWishlistToggle(beerId);

  const goBack = () => {
    if (location.key !== DEFAULT_LOCATION_KEY) void navigate(-1);
    else void navigate(RoutePathEnum.ENCYCLOPEDIA);
  };

  const unknownBeer = (
    <>
      <EmptyStatePanel
        mood={MascotMoodEnum.CONFUSED}
        title={t("pages.beerDetail.unknownTitle")}
        description={t("pages.beerDetail.unknownDescription")}
      />
      <Link
        to={RoutePathEnum.ENCYCLOPEDIA}
        className="inline-flex min-h-11 items-center justify-center text-link underline focus-visible:focus-ring"
      >
        {t("pages.beerDetail.backToEncyclopedia")}
      </Link>
    </>
  );

  const errorAlert = (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t("pages.beerDetail.errorTitle")}</Alert.Title>
      </Alert.Content>
      <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
        {t("common.retry")}
      </Button>
    </Alert>
  );

  const renderContent = () => {
    if (beerId === null || beer === null) return unknownBeer;
    if (isError) return errorAlert;
    if (isPending || beer === undefined) return <BeerDetailSkeleton />;

    const facts = [
      { key: "brewery", label: t("pages.beerDetail.brewery"), value: beer.breweryName },
      { key: "country", label: t("pages.beerDetail.country"), value: getCountryName(beer.country, i18n.language) },
      { key: "abv", label: t("pages.beerDetail.abv"), value: formatAbv(beer.abv, i18n.language) },
    ];
    const chipSections = [
      { key: "aromas", title: t("pages.beerDetail.aromas"), labels: beer.aromas.map((aroma) => t(BEER_AROMA_LABEL_KEYS[aroma])) },
      { key: "formats", title: t("pages.beerDetail.formats"), labels: beer.formats.map((format) => t(BEER_FORMAT_LABEL_KEYS[format])) },
    ].filter((section) => section.labels.length > 0);

    return (
      <>
        <PageHeader title={beer.name} />
        <div className="flex flex-wrap gap-3">
          <CheckinSheet beer={beer} />
          <ToggleButton
            size="lg"
            variant="default"
            isSelected={beer.inWishlist}
            isDisabled={isWishlistPending}
            onChange={toggleWishlist}
          >
            {t("pages.beerDetail.wishlist.toggle")}
          </ToggleButton>
        </div>
        <dl className="flex flex-col gap-3 rounded-mousse border-mousse bg-surface p-4 shadow-mousse">
          {facts.map(({ key, label, value }) => (
            <div key={key} className="flex min-w-0 flex-col">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-sm text-muted">{t("pages.beerDetail.style")}</dt>
            <dd className="flex flex-wrap items-center gap-2 break-words">
              <span>{beer.styleName}</span>
              {beer.family !== null && (
                <Chip color="accent" variant="primary">
                  {t(BEER_FAMILY_LABEL_KEYS[beer.family])}
                </Chip>
              )}
            </dd>
          </div>
        </dl>
        {chipSections.map(({ key, title, labels }) => (
          <section key={key} className="flex flex-col gap-2">
            <h2 className="font-display text-xl text-foreground">{title}</h2>
            <ul className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <li key={label}>
                  <Chip color="accent" variant="primary">
                    {label}
                  </Chip>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-foreground">{t("pages.beerDetail.description")}</h2>
          <p className="break-words">{beer.description}</p>
        </section>
        <CheckinHistory beerId={beer.id} />
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="lg" onPress={goBack}>
          {t("pages.beerDetail.back")}
        </Button>
      </div>
      {renderContent()}
    </div>
  );
};
