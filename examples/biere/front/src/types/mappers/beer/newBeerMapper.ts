import type { CreateBeerDto } from "@/types/dtos/beer/createBeerDto";
import type { NewBeer } from "@/types/models/beer/newBeer";

export const newBeerToDto = (newBeer: NewBeer): CreateBeerDto => ({
  name: newBeer.name,
  breweryName: newBeer.breweryName,
  country: newBeer.country,
  styleId: newBeer.styleId,
  abv: newBeer.abv,
  ibu: newBeer.ibu,
  ebc: newBeer.ebc,
  sweetness: newBeer.sweetness,
  acidity: newBeer.acidity,
  body: newBeer.body,
  aromas: newBeer.aromas,
  formats: newBeer.formats,
  description: newBeer.description,
});
