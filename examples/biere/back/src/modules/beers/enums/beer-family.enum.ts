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

export const BEER_FAMILY_BY_SEED_LABEL: Readonly<Record<string, BeerFamilyEnum>> = {
  Lager: BeerFamilyEnum.LAGER,
  Pilsner: BeerFamilyEnum.PILSNER,
  "Pale Ale": BeerFamilyEnum.PALE_ALE,
  IPA: BeerFamilyEnum.IPA,
  Blonde: BeerFamilyEnum.BLONDE,
  Ambrée: BeerFamilyEnum.AMBER,
  Brune: BeerFamilyEnum.BROWN,
  Stout: BeerFamilyEnum.STOUT,
  Porter: BeerFamilyEnum.PORTER,
  Blanche: BeerFamilyEnum.WITBIER,
  Weizen: BeerFamilyEnum.WEIZEN,
  Saison: BeerFamilyEnum.SAISON,
  Trappiste: BeerFamilyEnum.TRAPPIST,
  Abbaye: BeerFamilyEnum.ABBEY,
  "Belgian Strong": BeerFamilyEnum.BELGIAN_STRONG,
  "Sour / Lambic": BeerFamilyEnum.SOUR_LAMBIC,
  Fruitée: BeerFamilyEnum.FRUIT,
  "Sans alcool": BeerFamilyEnum.NON_ALCOHOLIC,
};

export const isBeerFamily = (value: string): value is BeerFamilyEnum =>
  Object.values(BeerFamilyEnum).includes(value as BeerFamilyEnum);
