export interface CreateBeerDto {
  name: string;
  breweryName: string;
  country: string;
  styleId: number;
  abv: number;
  description: string;
}
