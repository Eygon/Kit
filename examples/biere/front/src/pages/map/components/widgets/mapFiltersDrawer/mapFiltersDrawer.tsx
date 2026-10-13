import { Badge, Button, Checkbox, CheckboxGroup, Description, Drawer, Label, ListBox, Select, Switch } from "@heroui/react";
import type { Key } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MapFiltersDrawerProps } from "@/pages/map/types/mapFiltersDrawer";
import {
  ANY_FAMILY_KEY,
  FILTER_CHIPS_ROW_CLASSES,
  FILTER_CHIP_CLASSES,
  LEGEND_STATUS_SWATCH_SHAPE_CLASSES,
  LEGEND_SWATCH_BASE_CLASSES,
  LEGEND_TYPE_SWATCH_CLASSES,
  RADIUS_OPTIONS_KM,
} from "@/pages/map/utils/mapConstants";
import { BEER_FAMILY_LABEL_KEYS, BeerFamilyEnum, isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import {
  AVAILABILITY_STATUS_GLYPHS,
  AVAILABILITY_STATUS_LABEL_KEYS,
  AVAILABILITY_STATUS_MARKER_CLASSES,
  AvailabilityStatusEnum,
} from "@/types/enums/venue/availabilityStatusEnum";
import {
  VENUE_TYPE_LABEL_KEYS,
  VENUE_TYPE_MARKER_SHAPE_CLASSES,
  VenueTypeEnum,
  isVenueType,
} from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_MAP_FILTERS, countMapFilters } from "@/types/mappers/venue/mapFiltersMapper";

export const MapFiltersDrawer = ({ appliedFilters, hasPosition, onApply }: MapFiltersDrawerProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(appliedFilters);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (nextIsOpen) setDraft(appliedFilters);
    setIsOpen(nextIsOpen);
  };

  const handleFamilyChange = (key: Key | null) => {
    setDraft((previous) => ({ ...previous, family: isBeerFamily(key) ? key : null }));
  };

  const handleRadiusChange = (key: Key | null) => {
    const radiusKm = Number(key);
    if (RADIUS_OPTIONS_KM.includes(radiusKm)) setDraft((previous) => ({ ...previous, radiusKm }));
  };

  const apply = () => {
    onApply(draft);
    setIsOpen(false);
  };

  const activeCount = countMapFilters(hasPosition ? appliedFilters : { ...appliedFilters, radiusKm: null });

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Badge.Anchor className="shrink-0">
        <Button variant="secondary" size="lg">
          {t("pages.map.filters.title")}
        </Button>
        {activeCount > 0 && (
          <Badge color="accent">
            <span aria-hidden="true">{activeCount}</span>
            <span className="sr-only">{t("pages.map.filters.activeCount", { count: activeCount })}</span>
          </Badge>
        )}
      </Badge.Anchor>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>{t("pages.map.filters.title")}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[60dvh] min-w-0 flex-col gap-6 overflow-y-auto p-1">
              <CheckboxGroup
                value={draft.types}
                onChange={(types) => setDraft((previous) => ({ ...previous, types: types.filter(isVenueType) }))}
                className="gap-1"
              >
                <Label className="font-bold">{t("pages.map.filters.types")}</Label>
                <div className={FILTER_CHIPS_ROW_CLASSES}>
                  {Object.values(VenueTypeEnum).map((type) => (
                    <Checkbox key={type} value={type} className="mt-0 max-w-full min-w-0">
                      <Checkbox.Content className={FILTER_CHIP_CLASSES}>
                        <Label className="cursor-[inherit] text-inherit">{t(VENUE_TYPE_LABEL_KEYS[type])}</Label>
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                </div>
              </CheckboxGroup>
              <Select fullWidth value={draft.family ?? ANY_FAMILY_KEY} onChange={handleFamilyChange}>
                <Label className="font-bold">{t("pages.map.filters.family")}</Label>
                <Select.Trigger className="min-h-11">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id={ANY_FAMILY_KEY} textValue={t("pages.map.filters.anyFamily")} className="min-h-11">
                      {t("pages.map.filters.anyFamily")}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {Object.values(BeerFamilyEnum).map((family) => (
                      <ListBox.Item key={family} id={family} textValue={t(BEER_FAMILY_LABEL_KEYS[family])} className="min-h-11">
                        {t(BEER_FAMILY_LABEL_KEYS[family])}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Switch
                isSelected={draft.confirmedOnly}
                onChange={(confirmedOnly) => setDraft((previous) => ({ ...previous, confirmedOnly }))}
                className="w-full"
              >
                <Switch.Content className="min-h-11 w-full flex-row gap-3">
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Label className="min-w-0 break-words">{t("pages.map.filters.confirmedOnly")}</Label>
                </Switch.Content>
              </Switch>
              <Select
                fullWidth
                isDisabled={!hasPosition}
                value={draft.radiusKm === null ? null : String(draft.radiusKm)}
                onChange={handleRadiusChange}
              >
                <Label className="font-bold">{t("pages.map.filters.radius")}</Label>
                <Select.Trigger className="min-h-11">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                {!hasPosition && <Description>{t("pages.map.filters.radiusNeedsPosition")}</Description>}
                <Select.Popover>
                  <ListBox>
                    {RADIUS_OPTIONS_KM.map((radiusKm) => (
                      <ListBox.Item
                        key={radiusKm}
                        id={String(radiusKm)}
                        textValue={t("pages.map.filters.radiusOption", { count: radiusKm })}
                        className="min-h-11"
                      >
                        {t("pages.map.filters.radiusOption", { count: radiusKm })}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <section aria-label={t("pages.map.filters.legend")} className="flex min-w-0 flex-col gap-3">
                <h3 className="font-bold">{t("pages.map.filters.legend")}</h3>
                <ul className="flex min-w-0 flex-wrap gap-x-4 gap-y-3 p-1">
                  {Object.values(VenueTypeEnum).map((type) => (
                    <li key={type} data-testid={`legend-type-${type}`} className="flex min-w-0 items-center gap-3">
                      <span
                        data-testid="legend-swatch"
                        aria-hidden="true"
                        className={`${LEGEND_SWATCH_BASE_CLASSES} ${LEGEND_TYPE_SWATCH_CLASSES} ${VENUE_TYPE_MARKER_SHAPE_CLASSES[type]}`}
                      />
                      <span className="min-w-0 break-words">{t(VENUE_TYPE_LABEL_KEYS[type])}</span>
                    </li>
                  ))}
                </ul>
                <ul className="flex min-w-0 flex-wrap gap-x-4 gap-y-3 p-1">
                  {Object.values(AvailabilityStatusEnum).map((status) => (
                    <li key={status} data-testid={`legend-status-${status}`} className="flex min-w-0 items-center gap-3">
                      <span
                        data-testid="legend-swatch"
                        aria-hidden="true"
                        className={`${LEGEND_SWATCH_BASE_CLASSES} ${LEGEND_STATUS_SWATCH_SHAPE_CLASSES} ${AVAILABILITY_STATUS_MARKER_CLASSES[status]}`}
                      >
                        {AVAILABILITY_STATUS_GLYPHS[status]}
                      </span>
                      <span className="min-w-0 break-words">{t(AVAILABILITY_STATUS_LABEL_KEYS[status])}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </Drawer.Body>
            <Drawer.Footer className="flex flex-wrap gap-3">
              <Button variant="tertiary" size="lg" onPress={() => setDraft(EMPTY_MAP_FILTERS)}>
                {t("pages.map.filters.reset")}
              </Button>
              <Button variant="primary" size="lg" className="min-w-0 flex-1" onPress={apply}>
                {t("pages.map.filters.apply")}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
