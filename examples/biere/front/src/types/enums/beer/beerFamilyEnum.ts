export enum BeerFamilyEnum {
  LAGER = "lager",
  PILSNER = "pilsner",
  PALE_ALE = "paleAle",
  IPA = "ipa",
  BLONDE = "blonde",
  AMBER = "amber",
  BROWN = "brown",
  STOUT = "stout",
  PORTER = "porter",
  WITBIER = "witbier",
  WEIZEN = "weizen",
  SAISON = "saison",
  TRAPPIST = "trappist",
  ABBEY = "abbey",
  BELGIAN_STRONG = "belgianStrong",
  SOUR_LAMBIC = "sourLambic",
  FRUIT = "fruit",
  NON_ALCOHOLIC = "nonAlcoholic",
}

export const BEER_FAMILY_LABEL_KEYS: Record<BeerFamilyEnum, string> = {
  [BeerFamilyEnum.LAGER]: "beer.families.lager",
  [BeerFamilyEnum.PILSNER]: "beer.families.pilsner",
  [BeerFamilyEnum.PALE_ALE]: "beer.families.paleAle",
  [BeerFamilyEnum.IPA]: "beer.families.ipa",
  [BeerFamilyEnum.BLONDE]: "beer.families.blonde",
  [BeerFamilyEnum.AMBER]: "beer.families.amber",
  [BeerFamilyEnum.BROWN]: "beer.families.brown",
  [BeerFamilyEnum.STOUT]: "beer.families.stout",
  [BeerFamilyEnum.PORTER]: "beer.families.porter",
  [BeerFamilyEnum.WITBIER]: "beer.families.witbier",
  [BeerFamilyEnum.WEIZEN]: "beer.families.weizen",
  [BeerFamilyEnum.SAISON]: "beer.families.saison",
  [BeerFamilyEnum.TRAPPIST]: "beer.families.trappist",
  [BeerFamilyEnum.ABBEY]: "beer.families.abbey",
  [BeerFamilyEnum.BELGIAN_STRONG]: "beer.families.belgianStrong",
  [BeerFamilyEnum.SOUR_LAMBIC]: "beer.families.sourLambic",
  [BeerFamilyEnum.FRUIT]: "beer.families.fruit",
  [BeerFamilyEnum.NON_ALCOHOLIC]: "beer.families.nonAlcoholic",
};

export const isBeerFamily = (value: unknown): value is BeerFamilyEnum =>
  typeof value === "string" && Object.values<string>(BeerFamilyEnum).includes(value);
