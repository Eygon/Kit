export enum BeerAromaEnum {
  FRUITY = "fruity",
  CITRUS = "citrus",
  HOPPY = "hoppy",
  FLORAL = "floral",
  SPICY = "spicy",
  CARAMEL = "caramel",
  MALTY = "malty",
  ROASTED = "roasted",
  COFFEE = "coffee",
  CHOCOLATE = "chocolate",
  HONEY = "honey",
  BANANA = "banana",
  CLOVE = "clove",
  SOUR = "sour",
  WOODY = "woody",
  HERBAL = "herbal",
  SMOKY = "smoky",
  BISCUIT = "biscuit",
}

export const BEER_AROMA_LABEL_KEYS: Record<BeerAromaEnum, string> = {
  [BeerAromaEnum.FRUITY]: "beer.aromas.fruity",
  [BeerAromaEnum.CITRUS]: "beer.aromas.citrus",
  [BeerAromaEnum.HOPPY]: "beer.aromas.hoppy",
  [BeerAromaEnum.FLORAL]: "beer.aromas.floral",
  [BeerAromaEnum.SPICY]: "beer.aromas.spicy",
  [BeerAromaEnum.CARAMEL]: "beer.aromas.caramel",
  [BeerAromaEnum.MALTY]: "beer.aromas.malty",
  [BeerAromaEnum.ROASTED]: "beer.aromas.roasted",
  [BeerAromaEnum.COFFEE]: "beer.aromas.coffee",
  [BeerAromaEnum.CHOCOLATE]: "beer.aromas.chocolate",
  [BeerAromaEnum.HONEY]: "beer.aromas.honey",
  [BeerAromaEnum.BANANA]: "beer.aromas.banana",
  [BeerAromaEnum.CLOVE]: "beer.aromas.clove",
  [BeerAromaEnum.SOUR]: "beer.aromas.sour",
  [BeerAromaEnum.WOODY]: "beer.aromas.woody",
  [BeerAromaEnum.HERBAL]: "beer.aromas.herbal",
  [BeerAromaEnum.SMOKY]: "beer.aromas.smoky",
  [BeerAromaEnum.BISCUIT]: "beer.aromas.biscuit",
};

export const isBeerAroma = (value: unknown): value is BeerAromaEnum =>
  typeof value === "string" && Object.values<string>(BeerAromaEnum).includes(value);
