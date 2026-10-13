import { TagGroup, Tag } from "@heroui/react";
import type { Key, Selection } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { FamilyChipsProps } from "@/pages/encyclopedia/types/familyChips";
import { BEER_FAMILY_LABEL_KEYS, isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";

const ALL_FAMILIES_KEY = "all";

export const FamilyChips = ({ families, selectedFamily, onFamilyChange }: FamilyChipsProps) => {
  const { t } = useTranslation();

  const isSelectedFamilyMissing = selectedFamily !== null && !families.some((facet) => facet.value === selectedFamily);
  const chips = isSelectedFamilyMissing ? [...families, { value: selectedFamily, count: 0 }] : families;

  const handleSelectionChange = (selection: Selection) => {
    if (selection === "all") return;
    const [key]: Key[] = [...selection];
    if (key === ALL_FAMILIES_KEY) onFamilyChange(null);
    else if (isBeerFamily(key)) onFamilyChange(key);
  };

  return (
    <TagGroup
      aria-label={t("pages.encyclopedia.families.label")}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[selectedFamily ?? ALL_FAMILIES_KEY]}
      onSelectionChange={handleSelectionChange}
    >
      <TagGroup.List className="flex max-w-full flex-nowrap gap-2 overflow-x-auto p-1">
        <Tag id={ALL_FAMILIES_KEY} className="min-h-11 shrink-0">
          {t("pages.encyclopedia.families.all")}
        </Tag>
        {chips.map((facet) => (
          <Tag key={facet.value} id={facet.value} className="min-h-11 shrink-0">
            {t("pages.encyclopedia.families.chip", {
              label: t(BEER_FAMILY_LABEL_KEYS[facet.value]),
              count: facet.count,
            })}
          </Tag>
        ))}
      </TagGroup.List>
    </TagGroup>
  );
};
