export enum BeerSourceEnum {
  OFFICIAL = "official",
  COMMUNITY = "community",
}

export const isBeerSource = (value: unknown): value is BeerSourceEnum =>
  typeof value === "string" && Object.values<string>(BeerSourceEnum).includes(value);
