import { Badge, Button, Drawer, Label, ListBox, Radio, RadioGroup, Select, Slider } from "@heroui/react";
import type { Key } from "@heroui/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FacetCheckboxGroup } from "@/pages/encyclopedia/components/elements/facetCheckboxGroup/facetCheckboxGroup";
import { StyleFilterSection } from "@/pages/encyclopedia/components/elements/styleFilterSection/styleFilterSection";
import { useBeerPreviewQuery } from "@/pages/encyclopedia/hooks/useBeerPreviewQuery";
import type { BeerFiltersDrawerProps } from "@/pages/encyclopedia/types/beerFiltersDrawer";
import { countDrawerFilters } from "@/pages/encyclopedia/utils/countDrawerFilters";
import { FILTER_CHIPS_ROW_CLASSES, FILTER_CHIP_CLASSES } from "@/pages/encyclopedia/utils/encyclopediaConstants";
import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BEER_FORMAT_LABEL_KEYS, isBeerFormat } from "@/types/enums/beer/beerFormatEnum";
import { BEER_SORT_LABEL_KEYS, BeerSortEnum, isBeerSort } from "@/types/enums/beer/beerSortEnum";
import { BEER_STATUS_LABEL_KEYS, BeerStatusEnum, isBeerStatus } from "@/types/enums/beer/beerStatusEnum";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import type { FacetCount } from "@/types/models/beer/facetCount";
import { getCountryName } from "@/utils/country/getCountryName";

const MIN_ABV = 0;
const MAX_ABV = 14;
const ABV_STEP = 0.5;
const ALL_STATUSES_VALUE = "all";

const withCheckedValues = <TValue extends string>(facets: FacetCount<TValue>[], checked: TValue[]): FacetCount<TValue>[] => [
  ...facets,
  ...checked.filter((value) => !facets.some((facet) => facet.value === value)).map((value) => ({ value, count: 0 })),
];

export const BeerFiltersDrawer = ({ appliedQuery, onApply }: BeerFiltersDrawerProps) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(appliedQuery);
  const { total, facets, isError } = useBeerPreviewQuery(draft, isOpen);

  const appliedQueryKey = JSON.stringify(appliedQuery);

  useEffect(() => {
    setIsOpen(false);
  }, [appliedQueryKey]);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (nextIsOpen) setDraft(appliedQuery);
    setIsOpen(nextIsOpen);
  };

  const handleAbvChange = (value: number | number[]) => {
    if (!Array.isArray(value)) return;
    const [min, max] = value;
    setDraft((previous) => ({
      ...previous,
      abvMin: min <= MIN_ABV ? null : min,
      abvMax: max >= MAX_ABV ? null : max,
    }));
  };

  const handleFamilyChange = (family: BeerFamilyEnum | null) => {
    setDraft((previous) => ({ ...previous, family, styleIds: [] }));
  };

  const handleStatusChange = (value: string) => {
    if (value === ALL_STATUSES_VALUE) setDraft((previous) => ({ ...previous, status: null }));
    else if (isBeerStatus(value)) setDraft((previous) => ({ ...previous, status: value }));
  };

  const handleSortChange = (key: Key | null) => {
    if (isBeerSort(key)) setDraft((previous) => ({ ...previous, sort: key }));
  };

  const apply = () => {
    onApply(draft);
    setIsOpen(false);
  };

  const activeCount = countDrawerFilters(appliedQuery);
  const numberFormat = new Intl.NumberFormat(i18n.language);
  const abvRange = t("pages.encyclopedia.filters.abvRange", {
    min: numberFormat.format(draft.abvMin ?? MIN_ABV),
    max: numberFormat.format(draft.abvMax ?? MAX_ABV),
  });

  const countryOptions = withCheckedValues(facets?.countries ?? [], draft.countries).map((facet) => ({
    ...facet,
    label: getCountryName(facet.value, i18n.language),
  }));
  const formatOptions = withCheckedValues(facets?.formats ?? [], draft.formats).map((facet) => ({
    ...facet,
    label: t(BEER_FORMAT_LABEL_KEYS[facet.value]),
  }));

  const applyLabel =
    total === null || isError
      ? t("pages.encyclopedia.filters.applyUnknown")
      : t("pages.encyclopedia.filters.apply", { count: total });

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Badge.Anchor className="shrink-0">
        <Button variant="secondary" size="lg">
          {t("pages.encyclopedia.filters.title")}
        </Button>
        {activeCount > 0 && (
          <Badge color="accent">
            <span aria-hidden="true">{activeCount}</span>
            <span className="sr-only">{t("pages.encyclopedia.filters.activeCount", { count: activeCount })}</span>
          </Badge>
        )}
      </Badge.Anchor>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>{t("pages.encyclopedia.filters.title")}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[60dvh] min-w-0 flex-col gap-6 overflow-y-auto p-1">
              <RadioGroup value={draft.status ?? ALL_STATUSES_VALUE} onChange={handleStatusChange} className="gap-1">
                <Label className="font-bold">{t("pages.encyclopedia.filters.status")}</Label>
                <div className={FILTER_CHIPS_ROW_CLASSES}>
                  <Radio value={ALL_STATUSES_VALUE} className="mt-0 max-w-full min-w-0">
                    <Radio.Content className={FILTER_CHIP_CLASSES}>
                      <Label className="cursor-[inherit] text-inherit">{t("pages.encyclopedia.filters.allStatuses")}</Label>
                    </Radio.Content>
                  </Radio>
                  {Object.values(BeerStatusEnum).map((status) => (
                    <Radio key={status} value={status} className="mt-0 max-w-full min-w-0">
                      <Radio.Content className={FILTER_CHIP_CLASSES}>
                        <Label className="cursor-[inherit] text-inherit">{t(BEER_STATUS_LABEL_KEYS[status])}</Label>
                      </Radio.Content>
                    </Radio>
                  ))}
                </div>
              </RadioGroup>
              <StyleFilterSection
                family={draft.family}
                styleIds={draft.styleIds}
                onFamilyChange={handleFamilyChange}
                onStyleIdsChange={(styleIds) => setDraft((previous) => ({ ...previous, styleIds }))}
              />
              <Slider
                minValue={MIN_ABV}
                maxValue={MAX_ABV}
                step={ABV_STEP}
                value={[draft.abvMin ?? MIN_ABV, draft.abvMax ?? MAX_ABV]}
                onChange={handleAbvChange}
              >
                <Label>{t("pages.encyclopedia.filters.abv")}</Label>
                <Slider.Output>{abvRange}</Slider.Output>
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb index={0} />
                  <Slider.Thumb index={1} />
                </Slider.Track>
              </Slider>
              <FacetCheckboxGroup
                label={t("pages.encyclopedia.filters.countries")}
                options={countryOptions}
                value={draft.countries}
                onChange={(countries) => setDraft((previous) => ({ ...previous, countries }))}
              />
              <FacetCheckboxGroup
                label={t("pages.encyclopedia.filters.formats")}
                options={formatOptions}
                value={draft.formats}
                onChange={(formats) => setDraft((previous) => ({ ...previous, formats: formats.filter(isBeerFormat) }))}
              />
              <Select fullWidth value={draft.sort} onChange={handleSortChange}>
                <Label>{t("pages.encyclopedia.filters.sort")}</Label>
                <Select.Trigger className="min-h-11">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {Object.values(BeerSortEnum).map((sort) => (
                      <ListBox.Item key={sort} id={sort} textValue={t(BEER_SORT_LABEL_KEYS[sort])} className="min-h-11">
                        {t(BEER_SORT_LABEL_KEYS[sort])}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </Drawer.Body>
            <Drawer.Footer className="flex flex-wrap gap-3">
              <Button variant="tertiary" size="lg" onPress={() => setDraft(EMPTY_BEER_QUERY)}>
                {t("pages.encyclopedia.filters.reset")}
              </Button>
              <Button variant="primary" size="lg" className="min-w-0 flex-1" onPress={apply}>
                {applyLabel}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
