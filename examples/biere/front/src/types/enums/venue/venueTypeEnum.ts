export enum VenueTypeEnum {
  BAR = "bar",
  SHOP = "shop",
  BREWERY = "brewery",
}

export const VENUE_TYPE_LABEL_KEYS: Record<VenueTypeEnum, string> = {
  [VenueTypeEnum.BAR]: "venue.types.bar",
  [VenueTypeEnum.SHOP]: "venue.types.shop",
  [VenueTypeEnum.BREWERY]: "venue.types.brewery",
};

export const isVenueType = (value: unknown): value is VenueTypeEnum =>
  typeof value === "string" && Object.values<string>(VenueTypeEnum).includes(value);

export const VENUE_TYPE_MARKER_SHAPE_CLASSES: Record<VenueTypeEnum, string> = {
  [VenueTypeEnum.BAR]: "rounded-full",
  [VenueTypeEnum.SHOP]: "rounded-control",
  [VenueTypeEnum.BREWERY]: "rotate-45 rounded-control",
};
