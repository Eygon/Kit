import { Checkbox, CheckboxGroup, Label } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { FacetCheckboxGroupProps } from "@/pages/encyclopedia/types/facetCheckboxGroup";
import { FILTER_CHIPS_ROW_CLASSES, FILTER_CHIP_CLASSES } from "@/pages/encyclopedia/utils/encyclopediaConstants";

export const FacetCheckboxGroup = ({ label, options, value, onChange }: FacetCheckboxGroupProps) => {
  const { t } = useTranslation();

  return (
    <CheckboxGroup value={value} onChange={onChange} className="gap-1">
      <Label className="font-bold">{label}</Label>
      <div className={FILTER_CHIPS_ROW_CLASSES}>
        {options.map((option) => (
          <Checkbox key={option.value} value={option.value} className="mt-0 max-w-full min-w-0">
            <Checkbox.Content className={FILTER_CHIP_CLASSES}>
              <Label className="cursor-[inherit] text-inherit">
                {t("pages.encyclopedia.filters.facetOption", { label: option.label, count: option.count })}
              </Label>
            </Checkbox.Content>
          </Checkbox>
        ))}
      </div>
    </CheckboxGroup>
  );
};
