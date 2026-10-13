import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { AvailabilityBadgeProps } from "@/types/components/availabilityBadge";
import {
  AVAILABILITY_STATUS_CHIP_PROPS,
  AVAILABILITY_STATUS_GLYPHS,
  AVAILABILITY_STATUS_LABEL_KEYS,
} from "@/types/enums/venue/availabilityStatusEnum";

export const AvailabilityBadge = ({ status }: AvailabilityBadgeProps) => {
  const { t } = useTranslation();
  const { color, variant } = AVAILABILITY_STATUS_CHIP_PROPS[status];

  return (
    <Chip size="sm" color={color} variant={variant}>
      <span aria-hidden="true">{AVAILABILITY_STATUS_GLYPHS[status]}</span>
      {t(AVAILABILITY_STATUS_LABEL_KEYS[status])}
    </Chip>
  );
};
