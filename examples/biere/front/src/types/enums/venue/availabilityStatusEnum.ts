import type { ChipProps } from "@heroui/react";

export enum AvailabilityStatusEnum {
  CONFIRMED = "confirmed",
  MAYBE_GONE = "maybeGone",
  GONE = "gone",
  UNKNOWN = "unknown",
}

export const AVAILABILITY_STATUS_LABEL_KEYS: Record<AvailabilityStatusEnum, string> = {
  [AvailabilityStatusEnum.CONFIRMED]: "venue.statuses.confirmed",
  [AvailabilityStatusEnum.MAYBE_GONE]: "venue.statuses.maybeGone",
  [AvailabilityStatusEnum.GONE]: "venue.statuses.gone",
  [AvailabilityStatusEnum.UNKNOWN]: "venue.statuses.unknown",
};

export const isAvailabilityStatus = (value: unknown): value is AvailabilityStatusEnum =>
  typeof value === "string" && Object.values<string>(AvailabilityStatusEnum).includes(value);

export const AVAILABILITY_STATUS_GLYPHS: Record<AvailabilityStatusEnum, string> = {
  [AvailabilityStatusEnum.CONFIRMED]: "✓",
  [AvailabilityStatusEnum.MAYBE_GONE]: "?",
  [AvailabilityStatusEnum.GONE]: "✕",
  [AvailabilityStatusEnum.UNKNOWN]: "–",
};

export const AVAILABILITY_STATUS_MARKER_CLASSES: Record<AvailabilityStatusEnum, string> = {
  [AvailabilityStatusEnum.CONFIRMED]: "bg-accent text-accent-foreground border-mousse",
  [AvailabilityStatusEnum.MAYBE_GONE]: "bg-secondary text-secondary-foreground border-mousse",
  [AvailabilityStatusEnum.GONE]: "bg-surface text-muted line-through border-mousse",
  [AvailabilityStatusEnum.UNKNOWN]: "bg-surface text-foreground border-mousse",
};

export const AVAILABILITY_STATUS_CHIP_PROPS: Record<AvailabilityStatusEnum, Pick<ChipProps, "color" | "variant">> = {
  [AvailabilityStatusEnum.CONFIRMED]: { color: "accent", variant: "primary" },
  [AvailabilityStatusEnum.MAYBE_GONE]: { color: "default", variant: "secondary" },
  [AvailabilityStatusEnum.GONE]: { color: "default", variant: "tertiary" },
  [AvailabilityStatusEnum.UNKNOWN]: { color: "default", variant: "soft" },
};
