import { Card, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AverageRating } from "@/components/elements/averageRating/averageRating";
import type { BeerCardProps } from "@/pages/encyclopedia/types/beerCard";
import { buildBeerDetailPath } from "@/types/enums/routing/routePathEnum";
import { formatAbv } from "@/utils/beer/formatAbv";
import { getCountryName } from "@/utils/country/getCountryName";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";

const LINK_CLASSES = "block h-full min-h-11 min-w-0 rounded-mousse focus-visible:focus-ring";
const UNTASTED_LINK_CLASSES = `${LINK_CLASSES} opacity-85`;

export const BeerCard = ({ beer, discoveredAt }: BeerCardProps) => {
  const { t, i18n } = useTranslation();

  const renderLabelZone = () => {
    if (!beer.drunk) {
      return (
        <div className="flex min-h-11 items-center justify-center rounded-control bg-default px-2 py-3">
          <span aria-hidden="true" className="font-display text-xl">
            {t("pages.encyclopedia.card.unknownLabel")}
          </span>
          <span className="sr-only">{t("pages.encyclopedia.card.notTasted")}</span>
        </div>
      );
    }
    return (
      <div className="flex min-h-11 items-center justify-center py-1">
        <Chip color="accent" variant="primary" className="-rotate-3">
          {discoveredAt === null
            ? t("pages.encyclopedia.card.stampWithoutDate")
            : t("pages.encyclopedia.card.stamp", { date: formatCheckinDate(discoveredAt, i18n.language) })}
        </Chip>
      </div>
    );
  };

  return (
    <Link to={buildBeerDetailPath(beer.id)} className={beer.drunk ? LINK_CLASSES : UNTASTED_LINK_CLASSES}>
      <Card className="h-full min-w-0">
        <Card.Header className="min-w-0 gap-2">
          {renderLabelZone()}
          <Card.Title render={(props) => <h2 {...props} />} className="font-display text-xl break-words">
            {beer.name}
          </Card.Title>
          <Card.Description className="truncate">{beer.breweryName}</Card.Description>
        </Card.Header>
        <Card.Content className="flex min-w-0 flex-col gap-1 text-sm">
          <p className="truncate">{beer.styleName}</p>
          <p className="truncate">{formatAbv(beer.abv, i18n.language)}</p>
          <p className="truncate text-muted">{getCountryName(beer.country, i18n.language)}</p>
          <AverageRating averageRating={beer.averageRating} reviewCount={beer.reviewCount} />
        </Card.Content>
      </Card>
    </Link>
  );
};
