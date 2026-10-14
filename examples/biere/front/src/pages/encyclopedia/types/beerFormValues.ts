export type BeerFormValues = {
  name: string;
  breweryName: string;
  country: string | null;
  styleId: number | null;
  abv: number;
  description: string;
};

export type BeerFormErrorKeys = Partial<
  Record<"name" | "breweryName" | "country" | "styleId" | "abv" | "description", string>
>;
