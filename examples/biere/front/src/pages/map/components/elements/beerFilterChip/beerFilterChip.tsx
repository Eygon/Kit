import { Chip, CloseButton, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useFilteredBeerQuery } from "@/pages/map/hooks/useFilteredBeerQuery";
import type { BeerFilterChipProps } from "@/pages/map/types/beerFilterChip";

export const BeerFilterChip = ({ beerId, onRemove }: BeerFilterChipProps) => {
  const { t } = useTranslation();
  const { data: beer, isPending } = useFilteredBeerQuery(beerId);

  return (
    <Chip color="accent" variant="primary" size="lg" className="max-w-full min-w-0">
      {isPending ? (
        <Skeleton data-testid="beer-filter-chip-skeleton" className="h-4 w-24 rounded-full" />
      ) : (
        <Chip.Label className="min-w-0 break-words">
          {beer ? t("pages.map.beerFilter.label", { name: beer.name }) : t("pages.map.beerFilter.unknown")}
        </Chip.Label>
      )}
      <CloseButton aria-label={t("pages.map.beerFilter.remove")} className="size-11 shrink-0" onPress={onRemove} />
    </Chip>
  );
};
