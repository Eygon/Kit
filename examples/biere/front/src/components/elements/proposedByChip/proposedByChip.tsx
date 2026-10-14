import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { ProposedByChipProps } from "@/types/components/proposedByChip";

export const ProposedByChip = ({ name }: ProposedByChipProps) => {
  const { t } = useTranslation();

  return (
    <Chip color="default" variant="secondary" size="sm" className="max-w-full self-start truncate">
      {t("beer.proposedBy", { name })}
    </Chip>
  );
};
