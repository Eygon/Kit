import { Alert, Button, Checkbox, CheckboxGroup, Label, Radio, RadioGroup, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useBeerStyleGroupsQuery } from "@/pages/encyclopedia/hooks/useBeerStyleGroupsQuery";
import type { StyleFilterSectionProps } from "@/pages/encyclopedia/types/styleFilterSection";
import { FILTER_CHIPS_ROW_CLASSES, FILTER_CHIP_CLASSES } from "@/pages/encyclopedia/utils/encyclopediaConstants";
import { BEER_FAMILY_LABEL_KEYS, BeerFamilyEnum, isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";

const ALL_FAMILIES_VALUE = "all";
const SKELETON_ROW_KEYS = [0, 1, 2, 3];

export const StyleFilterSection = ({ family, styleIds, onFamilyChange, onStyleIdsChange }: StyleFilterSectionProps) => {
  const { t } = useTranslation();
  const { groups, isPending, isError, refetch } = useBeerStyleGroupsQuery();

  const styles = groups.find((group) => group.family === family)?.styles ?? [];

  const handleFamilyChange = (value: string) => {
    if (value === ALL_FAMILIES_VALUE) onFamilyChange(null);
    else if (isBeerFamily(value)) onFamilyChange(value);
  };

  const renderStyles = () => {
    if (isError) {
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.encyclopedia.filters.stylesError")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    }
    if (family === null) return null;
    if (isPending) {
      return (
        <div aria-busy="true" className="flex flex-col gap-2">
          {SKELETON_ROW_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      );
    }
    if (styles.length === 0) return null;
    return (
      <CheckboxGroup
        value={styleIds.map(String)}
        onChange={(values) => onStyleIdsChange(values.map(Number))}
        className="gap-1"
      >
        <Label className="font-bold">{t("pages.encyclopedia.filters.styles")}</Label>
        <div className={FILTER_CHIPS_ROW_CLASSES}>
          {styles.map((style) => (
            <Checkbox key={style.id} value={String(style.id)} className="mt-0 max-w-full min-w-0">
              <Checkbox.Content className={FILTER_CHIP_CLASSES}>
                <Label className="cursor-[inherit] text-inherit">{style.name}</Label>
              </Checkbox.Content>
            </Checkbox>
          ))}
        </div>
      </CheckboxGroup>
    );
  };

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <RadioGroup value={family ?? ALL_FAMILIES_VALUE} onChange={handleFamilyChange} className="gap-1">
        <Label className="font-bold">{t("pages.encyclopedia.filters.family")}</Label>
        <div className={FILTER_CHIPS_ROW_CLASSES}>
          <Radio value={ALL_FAMILIES_VALUE} className="mt-0 max-w-full min-w-0">
            <Radio.Content className={FILTER_CHIP_CLASSES}>
              <Label className="cursor-[inherit] text-inherit">{t("pages.encyclopedia.families.all")}</Label>
            </Radio.Content>
          </Radio>
          {Object.values(BeerFamilyEnum).map((value) => (
            <Radio key={value} value={value} className="mt-0 max-w-full min-w-0">
              <Radio.Content className={FILTER_CHIP_CLASSES}>
                <Label className="cursor-[inherit] text-inherit">{t(BEER_FAMILY_LABEL_KEYS[value])}</Label>
              </Radio.Content>
            </Radio>
          ))}
        </div>
      </RadioGroup>
      {renderStyles()}
    </section>
  );
};
