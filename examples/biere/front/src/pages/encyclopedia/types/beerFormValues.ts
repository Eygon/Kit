export type BeerFormValues = {
  name: string;
  breweryName: string;
  country: string | null;
  styleId: number | null;
  abv: number;
  ibu: number;
  ebc: number;
  sweetness: number;
  acidity: number;
  body: number;
  aromas: string[];
  formats: string[];
  description: string;
};

export type BeerFormErrorKeys = Partial<Record<keyof BeerFormValues, string>>;
