export interface BeerDto {
  id: number;
  name: string;
  breweryName: string;
  country: string;
  styleId: number;
  styleName: string;
  family: string;
  abv: number;
  aromas: string[];
  formats: string[];
  description: string;
  drunk?: boolean;
  checkinCount?: number;
  inWishlist?: boolean;
}
