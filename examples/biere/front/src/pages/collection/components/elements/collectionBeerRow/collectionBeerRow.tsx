import { Button, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { CollectionBeerRowProps } from "@/pages/collection/types/collectionBeerRow";
import { buildBeerDetailPath } from "@/types/enums/routing/routePathEnum";

export const CollectionBeerRow = ({
  beer,
  onRemove,
  isRemoving = false,
}: CollectionBeerRowProps) => {
  const { t } = useTranslation();

  return (
    <li className="flex min-w-0 items-center justify-between gap-3 rounded-mousse border-mousse bg-surface p-3 shadow-mousse">
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <Link
          to={buildBeerDetailPath(beer.beerId)}
          className="flex min-h-11 items-center font-bold break-words"
        >
          {beer.beerName}
        </Link>
        <span className="text-sm break-words text-muted">{beer.styleName}</span>
        {beer.drunkByMe ? (
          <Chip
            color="accent"
            variant="primary"
            className="mt-1 shrink-0 -rotate-3"
          >
            {t("pages.collection.drunk")}
          </Chip>
        ) : (
          <Chip color="default" variant="secondary" className="mt-1 shrink-0">
            {t("pages.collection.undrunk")}
          </Chip>
        )}
      </div>
      {onRemove !== undefined && (
        <Button
          size="lg"
          variant="danger-soft"
          className="shrink-0"
          aria-label={t("pages.collection.removeLabel", {
            name: beer.beerName,
          })}
          isPending={isRemoving}
          onPress={onRemove}
        >
          {t("pages.collection.remove")}
        </Button>
      )}
    </li>
  );
};
