export enum VenueTypeEnum {
  BAR = "bar",
  SHOP = "shop",
  BREWERY = "brewery",
}

export const isVenueType = (value: string): value is VenueTypeEnum =>
  Object.values(VenueTypeEnum).includes(value as VenueTypeEnum);
