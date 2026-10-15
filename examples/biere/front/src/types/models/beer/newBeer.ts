export interface NewBeer {
  name: string;
  breweryName: string;
  country: string;
  styleId: number;
  abv: number;
  ibu: number | null;
  ebc: number | null;
  sweetness: number | null;
  acidity: number | null;
  body: number | null;
  aromas: string[];
  formats: string[];
  description: string;
}
